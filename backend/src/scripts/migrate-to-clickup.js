import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Workspace from '../models/Workspace.js';
import Space from '../models/Space.js';
import List from '../models/List.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import Channel from '../models/Channel.js';

dotenv.config();

const migrateToClickUp = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all users
    const users = await User.find({ isActive: true });
    const adminUser = users.find(u => u.role === 'admin') || users[0];

    if (!adminUser) {
      console.log('No users found. Please create users first.');
      process.exit(1);
    }

    console.log(`Found ${users.length} users. Admin: ${adminUser.email}`);

    // Create default workspace
    let workspace = await Workspace.findOne({ isDeleted: false });

    if (!workspace) {
      console.log('Creating default workspace...');
      workspace = await Workspace.create({
        name: 'Main Workspace',
        description: 'Default workspace migrated from existing system',
        owner: adminUser._id,
        members: users.map(user => ({
          user: user._id,
          role: user.role === 'admin' ? 'owner' : user.role === 'manager' ? 'admin' : 'member',
          permissions: {
            canCreateSpaces: user.role !== 'employee',
            canManageMembers: user.role === 'admin',
            canDeleteWorkspace: user.role === 'admin',
            canManageSettings: user.role !== 'employee',
            canViewAllSpaces: true,
            canExportData: user.role !== 'employee'
          },
          joinedAt: user.dateOfJoining || new Date()
        }))
      });
      console.log(`Created workspace: ${workspace.name}`);
    } else {
      console.log(`Using existing workspace: ${workspace.name}`);
    }

    // Migrate existing projects to Spaces and Lists
    const projects = await Project.find({ isActive: true }).populate('client team.user projectManager');
    console.log(`Found ${projects.length} projects to migrate`);

    for (const project of projects) {
      // Check if space already exists for this project
      let space = await Space.findOne({ name: project.name, workspace: workspace._id });

      if (!space) {
        console.log(`Creating space for project: ${project.name}`);

        // Create space from project
        space = await Space.create({
          name: project.name,
          description: project.description,
          workspace: workspace._id,
          color: '#3B82F6',
          icon: 'folder',
          members: project.team.map(member => ({
            user: member.user?._id || member.user,
            role: member.role === 'lead' ? 'admin' : 'member',
            permissions: {
              canCreateFolders: true,
              canCreateLists: true,
              canCreateTasks: true,
              canEditTasks: true,
              canDeleteTasks: member.role === 'lead',
              canManageMembers: member.role === 'lead'
            },
            addedAt: new Date()
          })),
          createdBy: project.projectManager || adminUser._id
        });

        // Create default lists for the space
        const defaultLists = ['Backlog', 'To Do', 'In Progress', 'Done'];
        for (let i = 0; i < defaultLists.length; i++) {
          await List.create({
            name: defaultLists[i],
            space: space._id,
            workspace: workspace._id,
            order: i,
            createdBy: adminUser._id
          });
        }

        console.log(`  Created space with ${defaultLists.length} lists`);
      }
    }

    // Create department-based teams
    const departments = ['Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'];

    for (const dept of departments) {
      let team = await Team.findOne({ name: dept, workspace: workspace._id });

      if (!team) {
        const deptUsers = users.filter(u => u.department === dept);

        if (deptUsers.length > 0) {
          const lead = deptUsers.find(u => u.role === 'manager') || deptUsers[0];

          team = await Team.create({
            name: dept,
            description: `${dept} department team`,
            workspace: workspace._id,
            type: 'department',
            lead: lead._id,
            members: deptUsers.map(u => ({
              user: u._id,
              role: u._id.equals(lead._id) ? 'lead' : 'member',
              joinedAt: u.dateOfJoining || new Date()
            })),
            createdBy: adminUser._id
          });

          // Create general channel for team
          const channel = await Channel.create({
            name: 'General',
            description: `General channel for ${dept}`,
            workspace: workspace._id,
            team: team._id,
            type: 'public',
            members: deptUsers.map(u => ({
              user: u._id,
              role: u._id.equals(lead._id) ? 'admin' : 'member'
            })),
            createdBy: adminUser._id
          });

          team.channels.push(channel._id);
          team.settings.defaultChannel = channel._id;
          await team.save();

          console.log(`Created team: ${dept} with ${deptUsers.length} members`);
        }
      }
    }

    // Create company-wide channel
    let companyChannel = await Channel.findOne({ name: 'Company Announcements', workspace: workspace._id });

    if (!companyChannel) {
      companyChannel = await Channel.create({
        name: 'Company Announcements',
        description: 'Company-wide announcements and updates',
        workspace: workspace._id,
        type: 'public',
        members: users.map(u => ({
          user: u._id,
          role: u.role === 'admin' ? 'admin' : 'member'
        })),
        createdBy: adminUser._id
      });
      console.log('Created Company Announcements channel');
    }

    // Update workspace usage stats
    workspace.usage.membersCount = workspace.members.length;
    workspace.usage.spacesCount = await Space.countDocuments({ workspace: workspace._id, isDeleted: false });
    workspace.usage.tasksCount = await Task.countDocuments({ workspace: workspace._id, isDeleted: false });
    await workspace.save();

    console.log('\n=== Migration Summary ===');
    console.log(`Workspace: ${workspace.name}`);
    console.log(`Members: ${workspace.usage.membersCount}`);
    console.log(`Spaces: ${workspace.usage.spacesCount}`);
    console.log(`Tasks: ${workspace.usage.tasksCount}`);
    console.log(`Teams: ${await Team.countDocuments({ workspace: workspace._id, isDeleted: false })}`);
    console.log(`Channels: ${await Channel.countDocuments({ workspace: workspace._id, isDeleted: false })}`);
    console.log('\nMigration completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateToClickUp();
