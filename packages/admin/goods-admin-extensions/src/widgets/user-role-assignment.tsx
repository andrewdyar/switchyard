/* @refresh reload */
import { defineWidgetConfig } from "@medusajs/admin-sdk"
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
  Select,
  Toaster,
  toast,
} from "@medusajs/ui"
import { PencilSquare, Plus, Trash } from "@medusajs/icons"
import { useState, useEffect } from "react"

type Role = {
  id: string
  name: string
  description: string | null
  is_system: boolean
}

type SupabaseUser = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  user_metadata: {
    first_name?: string
    last_name?: string
  }
}

type UserRole = {
  user_id: string
  role_id: string
  assigned_at: string
  roles?: Role
}

const SUPABASE_URL = process.env.MEDUSA_ADMIN_SUPABASE_URL || ""
const SUPABASE_ANON_KEY = process.env.MEDUSA_ADMIN_SUPABASE_ANON_KEY || ""

const UserRoleAssignmentWidget = () => {
  const [users, setUsers] = useState<SupabaseUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<SupabaseUser | null>(null)
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const headers = {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      }

      // Fetch roles and user_roles
      const [rolesRes, userRolesRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/roles?select=*`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/user_roles?select=*,roles(*)`, { headers }),
      ])

      if (!rolesRes.ok || !userRolesRes.ok) {
        throw new Error("Failed to fetch data")
      }

      const [rolesData, userRolesData] = await Promise.all([
        rolesRes.json(),
        userRolesRes.json(),
      ])

      setRoles(rolesData)
      setUserRoles(userRolesData)

      // Get unique user IDs from user_roles
      const userIds = [...new Set(userRolesData.map((ur: UserRole) => ur.user_id))]
      
      // For demo purposes, we'll create placeholder user objects
      // In production, you'd fetch from auth.users via admin API
      const usersPlaceholder = userIds.map((id) => ({
        id: id as string,
        email: `User ${(id as string).slice(0, 8)}...`,
        created_at: new Date().toISOString(),
        last_sign_in_at: null,
        user_metadata: {},
      }))

      setUsers(usersPlaceholder)
    } catch (err) {
      console.error("Failed to fetch data:", err)
      setError(err instanceof Error ? err.message : "Failed to load user data")
    } finally {
      setLoading(false)
    }
  }

  const openEditDrawer = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    setSelectedUser(user)
    const currentRoles = userRoles
      .filter((ur) => ur.user_id === userId)
      .map((ur) => ur.role_id)
    setSelectedRoleIds(currentRoles)
    setIsDrawerOpen(true)
  }

  const handleSave = async () => {
    if (!selectedUser) return

    try {
      const headers = {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      }

      // Remove existing roles for this user
      await fetch(
        `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${selectedUser.id}`,
        {
          method: "DELETE",
          headers,
        }
      )

      // Add selected roles
      if (selectedRoleIds.length > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
          method: "POST",
          headers,
          body: JSON.stringify(
            selectedRoleIds.map((roleId) => ({
              user_id: selectedUser.id,
              role_id: roleId,
            }))
          ),
        })
      }

      toast.success("User roles updated")
      setIsDrawerOpen(false)
      fetchData()
    } catch (err) {
      console.error("Failed to update user roles:", err)
      toast.error(err instanceof Error ? err.message : "Failed to update roles")
    }
  }

  const handleRemoveRole = async (userId: string, roleId: string) => {
    try {
      const headers = {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      }

      await fetch(
        `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${userId}&role_id=eq.${roleId}`,
        {
          method: "DELETE",
          headers,
        }
      )

      toast.success("Role removed")
      fetchData()
    } catch (err) {
      console.error("Failed to remove role:", err)
      toast.error(err instanceof Error ? err.message : "Failed to remove role")
    }
  }

  const getUserRoles = (userId: string): UserRole[] => {
    return userRoles.filter((ur) => ur.user_id === userId)
  }

  const getRoleBadgeColor = (roleName: string): "green" | "blue" | "orange" | "purple" | "grey" => {
    const colors: Record<string, "green" | "blue" | "orange" | "purple" | "grey"> = {
      superadmin: "purple",
      manager: "blue",
      picker: "green",
      driver: "orange",
      robot: "grey",
    }
    return colors[roleName] || "grey"
  }

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">User Roles</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-ui-fg-subtle">Loading users...</Text>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">User Roles</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-ui-fg-error">{error}</Text>
        </div>
      </Container>
    )
  }

  // Group user roles by user
  const uniqueUserIds = [...new Set(userRoles.map((ur) => ur.user_id))]

  return (
    <>
      <Toaster />
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">User Roles</Heading>
        </div>

        {uniqueUserIds.length === 0 ? (
          <div className="px-6 py-4">
            <Text className="text-ui-fg-subtle">
              No users with roles assigned yet. Users will appear here once they
              log in and are assigned roles.
            </Text>
          </div>
        ) : (
          <div className="px-6 py-4">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>User ID</Table.HeaderCell>
                  <Table.HeaderCell>Roles</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {uniqueUserIds.map((userId) => {
                  const userRolesList = getUserRoles(userId)
                  return (
                    <Table.Row key={userId}>
                      <Table.Cell className="font-mono text-sm">
                        {userId.slice(0, 8)}...
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex flex-wrap gap-1">
                          {userRolesList.map((ur) => (
                            <Badge
                              key={ur.role_id}
                              color={getRoleBadgeColor(ur.roles?.name || "")}
                            >
                              {ur.roles?.name || ur.role_id.slice(0, 8)}
                            </Badge>
                          ))}
                        </div>
                      </Table.Cell>
                      <Table.Cell className="text-right">
                        <IconButton
                          size="small"
                          onClick={() => openEditDrawer(userId)}
                        >
                          <PencilSquare />
                        </IconButton>
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table>
          </div>
        )}
      </Container>

      {/* Edit Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Edit User Roles</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="p-4 space-y-4">
            {selectedUser && (
              <>
                <div>
                  <Label>User ID</Label>
                  <Text className="font-mono text-sm">{selectedUser.id}</Text>
                </div>

                <div>
                  <Label>Assigned Roles</Label>
                  <div className="mt-2 space-y-2">
                    {roles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`role-${role.id}`}
                            checked={selectedRoleIds.includes(role.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRoleIds([...selectedRoleIds, role.id])
                              } else {
                                setSelectedRoleIds(
                                  selectedRoleIds.filter((id) => id !== role.id)
                                )
                              }
                            }}
                            className="h-4 w-4"
                          />
                          <label
                            htmlFor={`role-${role.id}`}
                            className="cursor-pointer"
                          >
                            <Badge color={getRoleBadgeColor(role.name)}>
                              {role.name}
                            </Badge>
                            {role.description && (
                              <Text className="text-ui-fg-subtle text-sm ml-2">
                                {role.description}
                              </Text>
                            )}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </Drawer.Body>
          <Drawer.Footer>
            <Button variant="secondary" onClick={() => setIsDrawerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "settings.after",
})

export default UserRoleAssignmentWidget

