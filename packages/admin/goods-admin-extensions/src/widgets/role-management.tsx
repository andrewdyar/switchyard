/* @refresh reload */
import { defineWidgetConfig } from "@switchyard/admin-sdk"
import {
  Container,
  Heading,
  Text,
  Badge,
  Table,
  Button,
  IconButton,
  Drawer,
  Label,
  Input,
  Textarea,
  Checkbox,
  Toaster,
  toast,
} from "@switchyard/ui"
import { PencilSquare, Plus, Trash, XMark } from "@switchyard/icons"
import { useState, useEffect } from "react"

type Role = {
  id: string
  name: string
  description: string | null
  is_system: boolean
  created_at: string
}

type Permission = {
  id: string
  name: string
  description: string | null
  resource: string
  action: string
}

type RolePermission = {
  role_id: string
  permission_id: string
}

const SUPABASE_URL = process.env.MEDUSA_ADMIN_SUPABASE_URL || ""
const SUPABASE_ANON_KEY = process.env.MEDUSA_ADMIN_SUPABASE_ANON_KEY || ""

const RoleManagementWidget = () => {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch from Supabase directly (requires service role or RLS policy)
      const headers = {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      }

      const [rolesRes, permissionsRes, rolePermissionsRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/roles?select=*`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/permissions?select=*`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/role_permissions?select=*`, { headers }),
      ])

      if (!rolesRes.ok || !permissionsRes.ok || !rolePermissionsRes.ok) {
        throw new Error("Failed to fetch RBAC data")
      }

      const [rolesData, permissionsData, rolePermissionsData] = await Promise.all([
        rolesRes.json(),
        permissionsRes.json(),
        rolePermissionsRes.json(),
      ])

      setRoles(rolesData)
      setPermissions(permissionsData)
      setRolePermissions(rolePermissionsData)
    } catch (err) {
      console.error("Failed to fetch RBAC data:", err)
      setError(err instanceof Error ? err.message : "Failed to load role data")
    } finally {
      setLoading(false)
    }
  }

  const openCreateDrawer = () => {
    setEditingRole(null)
    setFormData({ name: "", description: "" })
    setSelectedPermissions([])
    setIsDrawerOpen(true)
  }

  const openEditDrawer = (role: Role) => {
    setEditingRole(role)
    setFormData({
      name: role.name,
      description: role.description || "",
    })
    // Get current permissions for this role
    const currentPermissions = rolePermissions
      .filter((rp) => rp.role_id === role.id)
      .map((rp) => rp.permission_id)
    setSelectedPermissions(currentPermissions)
    setIsDrawerOpen(true)
  }

  const handleSave = async () => {
    try {
      const headers = {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      }

      let roleId: string

      if (editingRole) {
        // Update existing role
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/roles?id=eq.${editingRole.id}`,
          {
            method: "PATCH",
            headers,
            body: JSON.stringify({
              name: formData.name,
              description: formData.description || null,
            }),
          }
        )

        if (!res.ok) throw new Error("Failed to update role")
        roleId = editingRole.id
      } else {
        // Create new role
        const res = await fetch(`${SUPABASE_URL}/rest/v1/roles`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: formData.name,
            description: formData.description || null,
            is_system: false,
          }),
        })

        if (!res.ok) throw new Error("Failed to create role")
        const data = await res.json()
        roleId = data[0].id
      }

      // Update permissions
      // First, remove all existing permissions for this role
      await fetch(
        `${SUPABASE_URL}/rest/v1/role_permissions?role_id=eq.${roleId}`,
        {
          method: "DELETE",
          headers,
        }
      )

      // Then add the selected permissions
      if (selectedPermissions.length > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/role_permissions`, {
          method: "POST",
          headers,
          body: JSON.stringify(
            selectedPermissions.map((permId) => ({
              role_id: roleId,
              permission_id: permId,
            }))
          ),
        })
      }

      toast.success(editingRole ? "Role updated" : "Role created")
      setIsDrawerOpen(false)
      fetchData()
    } catch (err) {
      console.error("Failed to save role:", err)
      toast.error(err instanceof Error ? err.message : "Failed to save role")
    }
  }

  const handleDelete = async (role: Role) => {
    if (role.is_system) {
      toast.error("Cannot delete system roles")
      return
    }

    if (!confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      return
    }

    try {
      const headers = {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      }

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/roles?id=eq.${role.id}`,
        {
          method: "DELETE",
          headers,
        }
      )

      if (!res.ok) throw new Error("Failed to delete role")

      toast.success("Role deleted")
      fetchData()
    } catch (err) {
      console.error("Failed to delete role:", err)
      toast.error(err instanceof Error ? err.message : "Failed to delete role")
    }
  }

  const getRolePermissionCount = (roleId: string): number => {
    return rolePermissions.filter((rp) => rp.role_id === roleId).length
  }

  const groupPermissionsByResource = () => {
    const grouped: Record<string, Permission[]> = {}
    permissions.forEach((p) => {
      if (!grouped[p.resource]) {
        grouped[p.resource] = []
      }
      grouped[p.resource].push(p)
    })
    return grouped
  }

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Role Management</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-ui-fg-subtle">Loading roles...</Text>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Role Management</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-ui-fg-error">{error}</Text>
          <Text className="text-ui-fg-subtle text-sm mt-2">
            Make sure Supabase environment variables are configured.
          </Text>
        </div>
      </Container>
    )
  }

  return (
    <>
      <Toaster />
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Role Management</Heading>
          <Button size="small" variant="secondary" onClick={openCreateDrawer}>
            <Plus />
            Add Role
          </Button>
        </div>

        <div className="px-6 py-4">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Role</Table.HeaderCell>
                <Table.HeaderCell>Description</Table.HeaderCell>
                <Table.HeaderCell>Permissions</Table.HeaderCell>
                <Table.HeaderCell>Type</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {roles.map((role) => (
                <Table.Row key={role.id}>
                  <Table.Cell className="font-medium">{role.name}</Table.Cell>
                  <Table.Cell className="text-ui-fg-subtle">
                    {role.description || "-"}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color="blue">{getRolePermissionCount(role.id)}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {role.is_system ? (
                      <Badge color="grey">System</Badge>
                    ) : (
                      <Badge color="green">Custom</Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    <div className="flex justify-end gap-2">
                      <IconButton size="small" onClick={() => openEditDrawer(role)}>
                        <PencilSquare />
                      </IconButton>
                      {!role.is_system && (
                        <IconButton
                          size="small"
                          variant="danger"
                          onClick={() => handleDelete(role)}
                        >
                          <Trash />
                        </IconButton>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      </Container>

      {/* Edit/Create Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>
              {editingRole ? "Edit Role" : "Create Role"}
            </Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="p-4 space-y-4">
            <div>
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., warehouse_manager"
                disabled={editingRole?.is_system}
              />
            </div>

            <div>
              <Label htmlFor="role-description">Description</Label>
              <Textarea
                id="role-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe what this role can do..."
              />
            </div>

            <div>
              <Label>Permissions</Label>
              <div className="mt-2 space-y-4 max-h-[400px] overflow-y-auto">
                {Object.entries(groupPermissionsByResource()).map(
                  ([resource, perms]) => (
                    <div key={resource} className="border rounded-lg p-3">
                      <Text className="font-medium capitalize mb-2">
                        {resource}
                      </Text>
                      <div className="space-y-2">
                        {perms.map((perm) => (
                          <div key={perm.id} className="flex items-center gap-2">
                            <Checkbox
                              id={perm.id}
                              checked={selectedPermissions.includes(perm.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedPermissions([
                                    ...selectedPermissions,
                                    perm.id,
                                  ])
                                } else {
                                  setSelectedPermissions(
                                    selectedPermissions.filter(
                                      (id) => id !== perm.id
                                    )
                                  )
                                }
                              }}
                            />
                            <Label
                              htmlFor={perm.id}
                              className="text-sm cursor-pointer"
                            >
                              {perm.name}
                              {perm.description && (
                                <span className="text-ui-fg-subtle ml-1">
                                  - {perm.description}
                                </span>
                              )}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <Button variant="secondary" onClick={() => setIsDrawerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingRole ? "Update" : "Create"}
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "settings.after",
})

export default RoleManagementWidget
