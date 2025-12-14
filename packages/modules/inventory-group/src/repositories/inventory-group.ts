// @ts-nocheck
import { Context, DAL, InferEntityType } from "@switchyard/framework/types"
import { DALUtils, SwitchyardError, isDefined } from "@switchyard/framework/utils"
import { LoadStrategy } from "@switchyard/framework/mikro-orm/core"
import { SqlEntityManager } from "@switchyard/framework/mikro-orm/postgresql"
import { InventoryGroup } from "../models"
import {
  CreateInventoryGroupDTO,
  InventoryGroupTransformOptions,
  UpdateGroupInput,
  generateHandle,
  generateLocationCode,
} from "../types"

export class InventoryGroupRepository extends DALUtils.MikroOrmBaseTreeRepository<
  typeof InventoryGroup
> {
  buildFindOptions(
    findOptions: DAL.FindOptions<typeof InventoryGroup> = { where: {} },
    familyOptions: InventoryGroupTransformOptions = {}
  ) {
    const findOptions_ = { ...findOptions }
    findOptions_.options ??= {}
    findOptions_.options.orderBy ??= {
      id: "ASC",
      rank: "ASC",
    }

    const fields = (findOptions_.options.fields ??= [])
    const populate = (findOptions_.options.populate ??= [])

    // mpath and parent_group_id needs to be added to the query for the tree building
    if (
      familyOptions.includeDescendantsTree ||
      familyOptions.includeAncestorsTree
    ) {
      fields.indexOf("mpath") === -1 && fields.push("mpath")
      fields.indexOf("parent_group_id") === -1 &&
        fields.push("parent_group_id")
    }

    const shouldExpandParent =
      familyOptions.includeAncestorsTree ||
      populate.includes("parent_group") ||
      fields.some((field) => field.startsWith("parent_group."))

    if (shouldExpandParent) {
      populate.indexOf("parent_group") === -1 &&
        populate.push("parent_group")
    }

    const shouldExpandChildren =
      familyOptions.includeDescendantsTree ||
      populate.includes("group_children") ||
      fields.some((field) => field.startsWith("group_children."))

    if (shouldExpandChildren) {
      populate.indexOf("group_children") === -1 &&
        populate.push("group_children")
    }

    Object.assign(findOptions_.options, {
      strategy: LoadStrategy.SELECT_IN,
    })

    return findOptions_
  }

  async find(
    findOptions: DAL.FindOptions<typeof InventoryGroup> = { where: {} },
    transformOptions: InventoryGroupTransformOptions = {},
    context: Context = {}
  ): Promise<InferEntityType<typeof InventoryGroup>[]> {
    const manager = super.getActiveManager<SqlEntityManager>(context)
    const findOptions_ = this.buildFindOptions(findOptions, transformOptions)

    const inventoryGroups = await manager.find(
      InventoryGroup.name,
      findOptions_.where,
      { ...findOptions_.options } as any
    )

    if (
      !transformOptions.includeDescendantsTree &&
      !transformOptions.includeAncestorsTree
    ) {
      return inventoryGroups
    }

    const groupsTree = await this.buildInventoryGroupsWithTree(
      {
        descendants: transformOptions.includeDescendantsTree,
        ancestors: transformOptions.includeAncestorsTree,
      },
      inventoryGroups,
      findOptions_,
      context
    )

    return this.sortGroupsByRank(groupsTree)
  }

  sortGroupsByRank(
    groups: InferEntityType<typeof InventoryGroup>[]
  ): InferEntityType<typeof InventoryGroup>[] {
    const sortedGroups = groups.sort((a, b) => a.rank - b.rank)

    for (const group of sortedGroups) {
      if ((group as any).group_children) {
        ;(group as any).group_children = this.sortGroupsByRank(
          (group as any).group_children
        )
      }
    }

    return sortedGroups
  }

  async buildInventoryGroupsWithTree(
    include: { descendants?: boolean; ancestors?: boolean },
    inventoryGroups: InferEntityType<typeof InventoryGroup>[],
    findOptions: DAL.FindOptions<typeof InventoryGroup> & {
      serialize?: boolean
    } = { where: {} },
    context: Context = {}
  ): Promise<InferEntityType<typeof InventoryGroup>[]> {
    const { serialize = true } = findOptions
    delete (findOptions as any).serialize

    const manager = super.getActiveManager<SqlEntityManager>(context)

    let relationIndex =
      findOptions.options?.populate?.indexOf("parent_group") ?? -1
    const shouldPopulateParent = relationIndex !== -1

    if (shouldPopulateParent && include.ancestors) {
      findOptions.options!.populate!.splice(relationIndex, 1)
    }

    relationIndex =
      findOptions.options?.populate?.indexOf("group_children") ?? -1
    const shouldPopulateChildren = relationIndex !== -1

    if (shouldPopulateChildren && include.descendants) {
      findOptions.options!.populate!.splice(relationIndex, 1)
    }

    const mpaths: any[] = []
    const parentMpaths = new Set<string>()

    for (const group of inventoryGroups) {
      if (include.descendants) {
        mpaths.push({ mpath: { $like: `${(group as any).mpath}%` } })
      }

      if (include.ancestors) {
        let parent = ""
        ;(group as any).mpath?.split(".").forEach((mpath: string) => {
          parentMpaths.add(parent + mpath)
          parent += mpath + "."
        })
      }
    }

    mpaths.push({ mpath: Array.from(parentMpaths) })

    const where = { ...findOptions.where, $or: mpaths } as any
    const options = {
      ...findOptions.options,
      limit: undefined,
      offset: 0,
    }

    delete where.id
    delete where.handle
    delete where.mpath
    delete where.parent_group_id
    delete where.type

    const groupsInTree = serialize
      ? await this.serialize(
          await manager.find(InventoryGroup.name, where, options as any)
        )
      : await manager.find(InventoryGroup.name, where, options as any)

    const groupsById = new Map(
      (groupsInTree as any[]).map((g) => [g.id, g])
    )

    // Build the full ancestor chain recursively
    if (include.ancestors) {
      const buildAncestorChain = (group: any): any => {
        if (!group || !group.parent_group_id) {
          return group
        }
        const parent = groupsById.get(group.parent_group_id)
        if (parent) {
          // Recursively build the parent's ancestor chain
          group.parent_group = buildAncestorChain({ ...parent })
        }
        return group
      }

      ;(groupsInTree as any[]).forEach((group) => {
        if (group.parent_group_id) {
          const parent = groupsById.get(group.parent_group_id)
          if (parent) {
            group.parent_group = buildAncestorChain({ ...parent })
          }
        }
      })
    }

    const populateChildren = (
      group: any,
      level: number = 0
    ): any => {
      const groups = (groupsInTree as any[]).filter(
        (child) => child.parent_group_id === group.id
      )

      if (include.descendants) {
        group.group_children = groups.map((child) => {
          return populateChildren(groupsById.get(child.id), level + 1)
        })
      }

      if (level === 0) {
        if (!include.ancestors && !shouldPopulateParent) {
          delete group.parent_group
        }
        return group
      }

      if (include.ancestors) {
        delete group.group_children
      }

      if (include.descendants) {
        delete group.parent_group
      }

      return group
    }

    const populatedGroups = inventoryGroups.map((g) => {
      const fullGroup = groupsById.get((g as any).id)
      return populateChildren(fullGroup)
    })

    return populatedGroups
  }

  async findAndCount(
    findOptions: DAL.FindOptions<typeof InventoryGroup> = { where: {} },
    transformOptions: InventoryGroupTransformOptions = {},
    context: Context = {}
  ): Promise<[InferEntityType<typeof InventoryGroup>[], number]> {
    const manager = super.getActiveManager<SqlEntityManager>(context)
    const findOptions_ = this.buildFindOptions(findOptions, transformOptions)

    const [inventoryGroups, count] = (await manager.findAndCount(
      InventoryGroup.name,
      findOptions_.where,
      findOptions_.options as any
    )) as [InferEntityType<typeof InventoryGroup>[], number]

    if (
      !transformOptions.includeDescendantsTree &&
      !transformOptions.includeAncestorsTree
    ) {
      return [inventoryGroups, count]
    }

    const groupsTree = await this.buildInventoryGroupsWithTree(
      {
        descendants: transformOptions.includeDescendantsTree,
        ancestors: transformOptions.includeAncestorsTree,
      },
      inventoryGroups,
      findOptions_,
      context
    )

    return [this.sortGroupsByRank(groupsTree), count]
  }

  async delete(ids: string[], context: Context = {}): Promise<string[]> {
    const manager = super.getActiveManager<SqlEntityManager>(context)
    await this.baseDelete(ids, context)
    await manager.nativeDelete(InventoryGroup.name, { id: ids }, {})
    return ids
  }

  async softDelete(
    ids: string[],
    context: Context = {}
  ): Promise<[InferEntityType<typeof InventoryGroup>[], Record<string, unknown[]>]> {
    const manager = super.getActiveManager<SqlEntityManager>(context)
    await this.baseDelete(ids, context)

    const groups = await Promise.all(
      ids.map(async (id) => {
        const inventoryGroup = await manager.findOne(InventoryGroup.name, {
          id,
        })

        if (!inventoryGroup) {
          throw new SwitchyardError(
            SwitchyardError.Types.NOT_FOUND,
            `InventoryGroup with id: ${id} was not found`
          )
        }

        manager.assign(inventoryGroup, { deleted_at: new Date() })
        return inventoryGroup
      })
    )

    manager.persist(groups)
    return [groups, {}]
  }

  async restore(
    ids: string[],
    context: Context = {}
  ): Promise<[InferEntityType<typeof InventoryGroup>[], Record<string, unknown[]>]> {
    const manager = super.getActiveManager<SqlEntityManager>(context)

    const groups = await Promise.all(
      ids.map(async (id) => {
        const inventoryGroup = await manager.findOneOrFail(InventoryGroup.name, {
          id,
        })
        manager.assign(inventoryGroup, { deleted_at: null })
        return inventoryGroup
      })
    )

    manager.persist(groups)
    return [groups, {}]
  }

  async baseDelete(ids: string[], context: Context = {}): Promise<void> {
    const manager = super.getActiveManager<SqlEntityManager>(context)

    await Promise.all(
      ids.map(async (id) => {
        const inventoryGroup = await manager.findOne(
          InventoryGroup.name,
          { id },
          {
            populate: ["group_children"],
          }
        )

        if (!inventoryGroup) {
          throw new SwitchyardError(
            SwitchyardError.Types.NOT_FOUND,
            `InventoryGroup with id: ${id} was not found`
          )
        }

        if ((inventoryGroup as any).group_children.length > 0) {
          throw new SwitchyardError(
            SwitchyardError.Types.NOT_ALLOWED,
            `Deleting InventoryGroup (${id}) with children is not allowed`
          )
        }

        await this.rerankSiblingsAfterDeletion(manager, inventoryGroup as any)
      })
    )
  }

  async create(
    data: CreateInventoryGroupDTO[],
    context: Context = {}
  ): Promise<InferEntityType<typeof InventoryGroup>[]> {
    const manager = super.getActiveManager<SqlEntityManager>(context)

    const groups = await Promise.all(
      data.map(async (entry, i) => {
        const groupData: any = {
          ...entry,
        }

        // Auto-generate handle if not provided
        if (!groupData.handle) {
          groupData.handle = generateHandle(
            groupData.type,
            groupData.zone_code,
            groupData.aisle_number ?? null,
            groupData.bay_number ?? null,
            groupData.shelf_number ?? null,
            groupData.slot_number ?? null
          )
        }

        // Auto-generate location_code if not provided
        if (!groupData.location_code && groupData.zone_code) {
          groupData.location_code = generateLocationCode(
            groupData.zone_code,
            groupData.aisle_number ?? null,
            groupData.bay_number ?? null,
            groupData.shelf_number ?? null,
            groupData.slot_number ?? null
          )
        }

        const siblingsCount = await manager.count(InventoryGroup.name, {
          parent_group_id: groupData?.parent_group_id || null,
        })

        groupData.rank ??= siblingsCount + i

        if (groupData.rank > siblingsCount + i) {
          groupData.rank = siblingsCount + i
        }

        if (groupData.rank < siblingsCount + i) {
          await this.rerankSiblingsAfterCreation(manager, groupData)
        }

        let parentGroup: any = null
        const parentGroupId =
          groupData.parent_group_id ?? groupData.parent_group?.id

        if (parentGroupId) {
          parentGroup = await manager.findOne(InventoryGroup.name, parentGroupId)

          if (!parentGroup) {
            throw new SwitchyardError(
              SwitchyardError.Types.INVALID_ARGUMENT,
              `Parent group with id: '${parentGroupId}' does not exist`
            )
          }
        }

        const result = await manager.create(InventoryGroup.name, groupData)

        // Compute mpath after creation so we have the id
        manager.assign(result, {
          mpath: parentGroup
            ? `${parentGroup.mpath}.${(result as any).id}`
            : (result as any).id,
        })

        return result
      })
    )

    manager.persist(groups)
    return groups
  }

  async update(
    data: UpdateGroupInput[],
    context: Context = {}
  ): Promise<InferEntityType<typeof InventoryGroup>[]> {
    const manager = super.getActiveManager<SqlEntityManager>(context)

    const groups = await Promise.all(
      data.map(async (entry, i) => {
        const groupData: any = {
          ...entry,
        }

        let inventoryGroup: any = await manager.findOne(
          InventoryGroup.name,
          groupData.id
        )

        if (!inventoryGroup) {
          throw new SwitchyardError(
            SwitchyardError.Types.NOT_FOUND,
            `InventoryGroup with id: ${groupData.id} was not found`
          )
        }

        // If the parent or rank are not changed, no need to reorder
        if (!isDefined(groupData.parent_group_id) && !isDefined(groupData.rank)) {
          for (const key in groupData) {
            if (isDefined(groupData[key])) {
              inventoryGroup[key] = groupData[key]
            }
          }

          manager.assign(inventoryGroup, groupData)
          return inventoryGroup
        }

        // Handle parent change with mpath updates
        if (
          isDefined(groupData.parent_group_id) &&
          groupData.parent_group_id !== inventoryGroup.parent_group_id
        ) {
          if (groupData.parent_group_id === null) {
            groupData.mpath = ""
          } else {
            inventoryGroup = (
              await this.buildInventoryGroupsWithTree(
                { descendants: true },
                [inventoryGroup],
                {
                  where: { id: inventoryGroup.id },
                  serialize: false,
                },
                context
              )
            )[0]

            const newParentGroup = await manager.findOne(
              InventoryGroup.name,
              groupData.parent_group_id
            )

            if (!newParentGroup) {
              throw new SwitchyardError(
                SwitchyardError.Types.INVALID_ARGUMENT,
                `Parent group with id: '${groupData.parent_group_id}' does not exist`
              )
            }

            const groupDataChildren = groupData.group_children?.flatMap(
              (child: any) => child.group_children ?? []
            )
            const groupDataChildrenMap = new Map(
              groupDataChildren?.map((child: any) => [child.id, child])
            )

            function updateMpathRecursively(group: any, newBaseMpath: string) {
              const newMpath = `${newBaseMpath}.${group.id}`
              group.mpath = newMpath

              for (let child of group.group_children) {
                child = manager.getReference(InventoryGroup.name, child.id)
                manager.assign(
                  child,
                  groupDataChildrenMap.get(child.id) ?? {}
                )
                updateMpathRecursively(child, newMpath)
              }
            }

            updateMpathRecursively(inventoryGroup, (newParentGroup as any).mpath)
          }

          const siblingsCount = await manager.count(InventoryGroup.name, {
            parent_group_id: groupData.parent_group_id,
          })

          groupData.rank ??= siblingsCount + i

          if (groupData.rank > siblingsCount + i) {
            groupData.rank = siblingsCount + i
          }

          if (groupData.rank < siblingsCount + i) {
            await this.rerankSiblingsAfterCreation(manager, groupData)
          }

          await this.rerankSiblingsAfterDeletion(manager, inventoryGroup)

          for (const key in groupData) {
            if (isDefined(groupData[key])) {
              inventoryGroup[key] = groupData[key]
            }
          }

          manager.assign(inventoryGroup, groupData)
          return inventoryGroup
        } else if (isDefined(groupData.rank)) {
          const siblingsCount = await manager.count(InventoryGroup.name, {
            parent_group_id: inventoryGroup.parent_group_id,
          })

          if (groupData.rank > siblingsCount - 1 + i) {
            groupData.rank = siblingsCount - 1 + i
          }

          await this.rerankAllSiblings(manager, inventoryGroup, groupData)
        }

        for (const key in groupData) {
          if (isDefined(groupData[key])) {
            inventoryGroup[key] = groupData[key]
          }
        }

        manager.assign(inventoryGroup, groupData)
        return inventoryGroup
      })
    )

    manager.persist(groups)
    return groups
  }

  protected async rerankSiblingsAfterDeletion(
    manager: SqlEntityManager,
    removedSibling: Partial<InferEntityType<typeof InventoryGroup>> & {
      parent_group_id?: string | null
      rank: number
    }
  ): Promise<void> {
    const affectedSiblings = await manager.find(InventoryGroup.name, {
      parent_group_id: removedSibling.parent_group_id,
      rank: { $gt: removedSibling.rank },
    })

    const updatedSiblings = affectedSiblings.map((sibling: any) => {
      manager.assign(sibling, { rank: sibling.rank - 1 })
      return sibling
    })

    manager.persist(updatedSiblings)
  }

  protected async rerankSiblingsAfterCreation(
    manager: SqlEntityManager,
    addedSibling: Partial<InferEntityType<typeof InventoryGroup>> & {
      parent_group_id?: string | null
      rank: number
    }
  ): Promise<void> {
    const affectedSiblings = await manager.find(InventoryGroup.name, {
      parent_group_id: addedSibling.parent_group_id,
      rank: { $gte: addedSibling.rank },
    })

    const updatedSiblings = affectedSiblings.map((sibling: any) => {
      manager.assign(sibling, { rank: sibling.rank + 1 })
      return sibling
    })

    manager.persist(updatedSiblings)
  }

  protected async rerankAllSiblings(
    manager: SqlEntityManager,
    originalSibling: Partial<InferEntityType<typeof InventoryGroup>> & {
      parent_group_id?: string | null
      rank: number
    },
    updatedSibling: Partial<InferEntityType<typeof InventoryGroup>> & {
      rank: number
    }
  ): Promise<void> {
    if (originalSibling.rank === updatedSibling.rank) {
      return
    }

    if (originalSibling.rank < updatedSibling.rank) {
      const siblings = await manager.find(
        InventoryGroup.name,
        {
          parent_group_id: originalSibling.parent_group_id,
          rank: { $gt: originalSibling.rank, $lte: updatedSibling.rank },
        },
        { orderBy: { rank: "ASC" } }
      )

      const updatedSiblings = siblings.map((sibling: any) => {
        manager.assign(sibling, { rank: sibling.rank - 1 })
        return sibling
      })

      manager.persist(updatedSiblings)
    } else {
      const siblings = await manager.find(
        InventoryGroup.name,
        {
          parent_group_id: originalSibling.parent_group_id,
          rank: { $gte: updatedSibling.rank, $lt: originalSibling.rank },
        },
        { orderBy: { rank: "ASC" } }
      )

      const updatedSiblings = siblings.map((sibling: any) => {
        manager.assign(sibling, { rank: sibling.rank + 1 })
        return sibling
      })

      manager.persist(updatedSiblings)
    }
  }
}

