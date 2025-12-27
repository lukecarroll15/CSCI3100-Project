import { Types } from 'mongoose';
import { UserModel, type UserDoc } from '../../models/User';
import { TeamModel, type TeamDoc } from '../../models/Team';
import { TeamMembershipModel, type TeamMembershipDoc } from '../../models/TeamMembership';
import { LicenceKeyModel, type LicenceKeyDoc } from '../../models/LicenceKey';
import { DepartmentModel, type DepartmentDoc } from '../../models/Department';
import Folder, { type IFolder } from '../../models/Folder';
import { FileModel, type FileDoc } from '../../models/File';
import { TaskModel, type TaskDoc } from '../../models/Task';

type CreateUserOptions = Partial<{
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  adminLevel: 'owner' | 'admin' | null;
  githubId: string;
  githubUsername: string;
}>;

export async function createUser(options: CreateUserOptions = {}): Promise<UserDoc> {
  return UserModel.create({
    email: options.email ?? `user-${Date.now()}@example.com`,
    displayName: options.displayName ?? 'Test User',
    role: options.role ?? 'user',
    adminLevel: options.adminLevel ?? null,
    githubId: options.githubId,
    githubUsername: options.githubUsername ?? '',
  });
}

type CreateTeamOptions = {
  name?: string;
  createdBy: Types.ObjectId;
};

export async function createTeam(options: CreateTeamOptions): Promise<TeamDoc> {
  return TeamModel.create({
    name: options.name ?? `Team-${Date.now()}`,
    createdBy: options.createdBy,
    inviteOnly: true,
  });
}

export async function addTeamMember(options: {
  teamId: Types.ObjectId;
  userId: Types.ObjectId;
  role?: 'owner' | 'admin' | 'member';
}): Promise<TeamMembershipDoc> {
  return TeamMembershipModel.create({
    teamId: options.teamId,
    userId: options.userId,
    role: options.role ?? 'member',
  });
}

export async function createOwnerTeam(
  owner: UserDoc,
  name?: string
): Promise<{ team: TeamDoc; membership: TeamMembershipDoc }> {
  const team = await createTeam({ name, createdBy: owner._id });
  const membership = await addTeamMember({
    teamId: team._id,
    userId: owner._id,
    role: 'owner',
  });
  return { team, membership };
}

type CreateLicenceKeyOptions = Partial<{
  key: string;
  ownerUserId: Types.ObjectId | null;
  teamId: Types.ObjectId | null;
  usesCount: number;
  maxUses: number;
  expiresAt: Date | null;
  redeemed: boolean;
  revoked: boolean;
}>;

export async function createLicenceKey(
  options: CreateLicenceKeyOptions = {}
): Promise<LicenceKeyDoc> {
  return LicenceKeyModel.create({
    key: options.key ?? 'AAAA-BBBB-CCCC',
    ownerUserId: options.ownerUserId ?? null,
    teamId: options.teamId ?? null,
    redeemed: options.redeemed ?? false,
    usesCount: options.usesCount ?? 0,
    maxUses: options.maxUses ?? 5,
    revoked: options.revoked ?? false,
    expiresAt: options.expiresAt ?? null,
  });
}

export async function createDepartment(options: {
  teamId: Types.ObjectId;
  createdBy: Types.ObjectId;
  name?: string;
}): Promise<DepartmentDoc> {
  return DepartmentModel.create({
    name: options.name ?? `Department-${Date.now()}`,
    createdBy: options.createdBy,
    teamId: options.teamId,
  });
}

export async function createFolder(options: {
  teamId: Types.ObjectId;
  createdBy: Types.ObjectId;
  name?: string;
  parentFolder?: Types.ObjectId | null;
  department?: string;
  isPrivate?: boolean;
}): Promise<IFolder> {
  return Folder.create({
    name: options.name ?? `Folder-${Date.now()}`,
    parentFolder: options.parentFolder ?? null,
    createdBy: options.createdBy,
    teamId: options.teamId,
    department: options.department ?? 'Workspace',
    isPrivate: options.isPrivate ?? false,
  });
}

export async function createFile(options: {
  teamId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  originalName?: string;
  storedName?: string;
  mimeType?: string;
  size?: number;
  department?: string;
  folder?: Types.ObjectId | null;
  isAdminOnly?: boolean;
  isPrivate?: boolean;
}): Promise<FileDoc> {
  return FileModel.create({
    originalName: options.originalName ?? 'file.txt',
    storedName: options.storedName ?? `file-${Date.now()}.txt`,
    mimeType: options.mimeType ?? 'text/plain',
    size: options.size ?? 10,
    uploadedBy: options.uploadedBy,
    teamId: options.teamId,
    department: options.department ?? 'General',
    folder: options.folder ?? null,
    isAdminOnly: options.isAdminOnly ?? false,
    isPrivate: options.isPrivate ?? false,
  });
}

export async function createTask(options: {
  teamId: Types.ObjectId;
  createdBy: Types.ObjectId;
  name?: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  department?: string;
  assignee?: string[];
  dueDate?: Date;
  status?: 'Not Started' | 'In Progress' | 'Completed';
}): Promise<TaskDoc> {
  return TaskModel.create({
    name: options.name ?? 'Sample Task',
    description: options.description ?? '',
    priority: options.priority ?? 'medium',
    department: options.department ?? 'General',
    assignee: options.assignee ?? [],
    dueDate: options.dueDate ?? new Date(Date.now() + 86400000),
    status: options.status ?? 'Not Started',
    createdBy: options.createdBy,
    teamId: options.teamId,
  });
}
