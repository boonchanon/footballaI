"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Users,
  Eye,
  FileEdit,
  Settings,
  Database,
  Brain,
} from "lucide-react"

const roles = [
  {
    id: 1,
    name: "Super Admin",
    description: "Full access to all features and settings",
    userCount: 2,
    color: "bg-red-500",
    permissions: ["all"],
    isSystem: true,
  },
  {
    id: 2,
    name: "Admin",
    description: "Manage core football data and operational tools",
    userCount: 5,
    color: "bg-orange-500",
    permissions: ["dashboard.view", "content.manage", "matches.manage", "teams.manage", "players.manage", "ai.manage"],
    isSystem: true,
  },
  {
    id: 3,
    name: "Admin Community",
    description: "Moderate community content, reports, and safety settings only",
    userCount: 8,
    color: "bg-purple-500",
    permissions: ["dashboard.view", "community.moderate"],
    isSystem: true,
  },
]

const permissionCategories = [
  {
    name: "Dashboard",
    icon: Eye,
    permissions: [
      { id: "dashboard.view", label: "View Dashboard", description: "Access admin dashboard" },
      { id: "dashboard.analytics", label: "View Analytics", description: "Access analytics data" },
    ],
  },
  {
    name: "Users",
    icon: Users,
    permissions: [
      { id: "users.view", label: "View Users", description: "View user list" },
      { id: "users.manage", label: "Manage Users", description: "Create, edit, delete users" },
      { id: "users.roles", label: "Manage Roles", description: "Assign and manage user roles" },
    ],
  },
  {
    name: "Content",
    icon: FileEdit,
    permissions: [
      { id: "content.view", label: "View Content", description: "View all content" },
      { id: "content.manage", label: "Manage Content", description: "Create, edit, delete content" },
      { id: "content.publish", label: "Publish Content", description: "Publish and unpublish content" },
    ],
  },
  {
    name: "Matches & Teams",
    icon: Database,
    permissions: [
      { id: "matches.view", label: "View Matches", description: "View match data" },
      { id: "matches.manage", label: "Manage Matches", description: "Create, edit matches" },
      { id: "teams.manage", label: "Manage Teams", description: "Create, edit teams" },
      { id: "players.manage", label: "Manage Players", description: "Create, edit players" },
    ],
  },
  {
    name: "AI Prediction",
    icon: Brain,
    permissions: [
      { id: "ai.view", label: "View AI Settings", description: "View AI configuration" },
      { id: "ai.manage", label: "Manage AI", description: "Configure AI models" },
      { id: "ai.train", label: "Train Models", description: "Start model training" },
    ],
  },
  {
    name: "Settings",
    icon: Settings,
    permissions: [
      { id: "settings.view", label: "View Settings", description: "View system settings" },
      { id: "settings.manage", label: "Manage Settings", description: "Modify system settings" },
    ],
  },
]

export default function RolesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<typeof roles[0] | null>(null)

  const handleEdit = (role: typeof roles[0]) => {
    setSelectedRole(role)
    setIsEditDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Roles & Permissions</h1>
          <p className="text-muted-foreground mt-1">
            Manage user roles and access permissions
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>
                Define a new role with specific permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="roleName">Role Name</Label>
                  <Input id="roleName" placeholder="Enter role name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roleColor">Role Color</Label>
                  <div className="flex items-center gap-2">
                    <Input id="roleColor" type="color" className="w-20 h-10 p-1" defaultValue="#3b82f6" />
                    <span className="text-sm text-muted-foreground">Choose a color for this role</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="roleDescription">Description</Label>
                <Input id="roleDescription" placeholder="Brief description of this role" />
              </div>

              <div className="space-y-4">
                <Label>Permissions</Label>
                {permissionCategories.map((category) => (
                  <Card key={category.name}>
                    <CardHeader className="py-3">
                      <div className="flex items-center gap-2">
                        <category.icon className="h-4 w-4" />
                        <CardTitle className="text-sm">{category.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="space-y-3">
                        {category.permissions.map((permission) => (
                          <div key={permission.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox id={permission.id} />
                              <div>
                                <Label htmlFor={permission.id} className="font-medium cursor-pointer">
                                  {permission.label}
                                </Label>
                                <p className="text-xs text-muted-foreground">{permission.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(false)}>
                Create Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Roles Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id} className="relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${role.color}`} />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <CardTitle className="text-lg">{role.name}</CardTitle>
                </div>
                {role.isSystem && (
                  <Badge variant="outline" className="text-xs">System</Badge>
                )}
              </div>
              <CardDescription>{role.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{role.userCount} users</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(role)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  {!role.isSystem && (
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permissions Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Permissions Matrix</CardTitle>
          <CardDescription>
            Overview of permissions across all roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Permission</TableHead>
                  {roles.map((role) => (
                    <TableHead key={role.id} className="text-center min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-3 h-3 rounded-full ${role.color}`} />
                        <span className="text-xs">{role.name}</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissionCategories.map((category) => (
                  <>
                    <TableRow key={category.name} className="bg-muted/50">
                      <TableCell colSpan={roles.length + 1} className="font-medium">
                        <div className="flex items-center gap-2">
                          <category.icon className="h-4 w-4" />
                          {category.name}
                        </div>
                      </TableCell>
                    </TableRow>
                    {category.permissions.map((permission) => (
                      <TableRow key={permission.id}>
                        <TableCell className="pl-8">{permission.label}</TableCell>
                        {roles.map((role) => (
                          <TableCell key={`${role.id}-${permission.id}`} className="text-center">
                            <Switch
                              defaultChecked={
                                role.permissions.includes("all") ||
                                role.permissions.some((p) => permission.id.startsWith(p.split(".")[0]))
                              }
                              disabled={role.isSystem && role.name === "Super Admin"}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role: {selectedRole?.name}</DialogTitle>
            <DialogDescription>
              Modify role settings and permissions
            </DialogDescription>
          </DialogHeader>
          {selectedRole && (
            <div className="space-y-6 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="editRoleName">Role Name</Label>
                  <Input
                    id="editRoleName"
                    defaultValue={selectedRole.name}
                    disabled={selectedRole.isSystem}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editRoleColor">Role Color</Label>
                  <Input
                    id="editRoleColor"
                    type="color"
                    className="w-20 h-10 p-1"
                    defaultValue="#3b82f6"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRoleDescription">Description</Label>
                <Input
                  id="editRoleDescription"
                  defaultValue={selectedRole.description}
                />
              </div>

              <div className="space-y-4">
                <Label>Permissions</Label>
                {permissionCategories.map((category) => (
                  <Card key={category.name}>
                    <CardHeader className="py-3">
                      <div className="flex items-center gap-2">
                        <category.icon className="h-4 w-4" />
                        <CardTitle className="text-sm">{category.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="space-y-3">
                        {category.permissions.map((permission) => (
                          <div key={permission.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id={`edit-${permission.id}`}
                                defaultChecked={
                                  selectedRole.permissions.includes("all") ||
                                  selectedRole.permissions.some((p) =>
                                    permission.id.startsWith(p.split(".")[0])
                                  )
                                }
                                disabled={selectedRole.name === "Super Admin"}
                              />
                              <div>
                                <Label
                                  htmlFor={`edit-${permission.id}`}
                                  className="font-medium cursor-pointer"
                                >
                                  {permission.label}
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  {permission.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsEditDialogOpen(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
