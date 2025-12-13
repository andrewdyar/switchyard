import { toast, usePrompt } from "@switchyard/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import {
  InventoryGroupDTO,
  useDeleteInventoryGroup,
} from "../../../../hooks/api/inventory-groups"

export const useDeleteInventoryGroupAction = (
  inventoryGroup: InventoryGroupDTO
) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const prompt = usePrompt()
  const { mutateAsync } = useDeleteInventoryGroup(inventoryGroup.id)

  const handleDelete = async () => {
    const result = await prompt({
      title: t("general.areYouSure"),
      description: t("inventoryGroups.delete.confirmation", {
        name: inventoryGroup.name,
      }),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!result) {
      return
    }

    await mutateAsync(undefined, {
      onSuccess: () => {
        toast.success(
          t("inventoryGroups.delete.success", {
            name: inventoryGroup.name,
          })
        )
        navigate("/groups", { replace: true })
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  }

  return handleDelete
}

