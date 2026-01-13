import express from 'express';
import { protect, restrictTo, isManagerOrAbove } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Get all projects with pagination and filtering
router.get('/', async (req, res, next) => {
  try {
    const Project = (await import('../models/Project.js')).default;
    const { status, department, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (department) query.department = department;

    const skip = (page - 1) * limit;
    const projects = await Project.find(query)
      .populate('manager', 'firstName lastName employeeId')
      .populate('team', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Project.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        projects,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single project details
router.get('/:id', async (req, res, next) => {
  try {
    const Project = (await import('../models/Project.js')).default;
    const project = await Project.findById(req.params.id)
      .populate('manager', 'firstName lastName employeeId email')
      .populate('team', 'firstName lastName employeeId email role');

    if (!project) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Project not found', 404));
    }

    res.status(200).json({ status: 'success', data: { project } });
  } catch (error) {
    next(error);
  }
});

// Create new project
router.post('/', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Project = (await import('../models/Project.js')).default;
    const { name, description, status, department, manager, budget, deadline } = req.body;

    const project = await Project.create({
      name,
      description,
      status: status || 'planning',
      department,
      manager: manager || req.user._id,
      budget,
      deadline,
      team: []
    });

    const populatedProject = await project.populate('manager', 'firstName lastName employeeId');

    res.status(201).json({
      status: 'success',
      message: 'Project created successfully',
      data: { project: populatedProject }
    });
  } catch (error) {
    next(error);
  }
});

// Update project
router.put('/:id', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Project = (await import('../models/Project.js')).default;
    const { name, description, status, department, budget, deadline } = req.body;

    const project = await Project.findById(req.params.id);

    if (!project) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Project not found', 404));
    }

    // Only admin or project manager can update
    if (req.user.role !== 'admin' && project.manager.toString() !== req.user._id.toString()) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Not authorized to update this project', 403));
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      { name, description, status, department, budget, deadline },
      { new: true, runValidators: true }
    ).populate('manager', 'firstName lastName employeeId');

    res.status(200).json({
      status: 'success',
      message: 'Project updated successfully',
      data: { project: updatedProject }
    });
  } catch (error) {
    next(error);
  }
});

// Delete/Archive project
router.delete('/:id', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Project = (await import('../models/Project.js')).default;
    const project = await Project.findById(req.params.id);

    if (!project) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Project not found', 404));
    }

    // Only admin or project manager can delete
    if (req.user.role !== 'admin' && project.manager.toString() !== req.user._id.toString()) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Not authorized to delete this project', 403));
    }

    await Project.findByIdAndUpdate(req.params.id, { status: 'archived' });

    res.status(200).json({
      status: 'success',
      message: 'Project archived successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Assign team members to project
router.post('/:id/assign-team', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Project = (await import('../models/Project.js')).default;
    const { teamMembers } = req.body;

    if (!Array.isArray(teamMembers) || teamMembers.length === 0) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Team members array is required', 400));
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Project not found', 404));
    }

    // Only admin or project manager can assign team
    if (req.user.role !== 'admin' && project.manager.toString() !== req.user._id.toString()) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Not authorized to assign team members', 403));
    }

    // Add new members, avoiding duplicates
    const currentTeam = project.team.map(id => id.toString());
    const newMembers = teamMembers.filter(id => !currentTeam.includes(id.toString()));

    project.team.push(...newMembers);
    await project.save();

    const updatedProject = await project.populate('team', 'firstName lastName employeeId role');

    res.status(200).json({
      status: 'success',
      message: 'Team members assigned successfully',
      data: { project: updatedProject }
    });
  } catch (error) {
    next(error);
  }
});

// Remove team member from project
router.delete('/:id/team/:memberId', restrictTo('admin', 'manager'), async (req, res, next) => {
  try {
    const Project = (await import('../models/Project.js')).default;
    const project = await Project.findById(req.params.id);

    if (!project) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Project not found', 404));
    }

    // Only admin or project manager can remove team members
    if (req.user.role !== 'admin' && project.manager.toString() !== req.user._id.toString()) {
      const { AppError } = await import('../utils/appError.js');
      return next(new AppError('Not authorized to remove team members', 403));
    }

    project.team = project.team.filter(id => id.toString() !== req.params.memberId);
    await project.save();

    const updatedProject = await project.populate('team', 'firstName lastName employeeId');

    res.status(200).json({
      status: 'success',
      message: 'Team member removed successfully',
      data: { project: updatedProject }
    });
  } catch (error) {
    next(error);
  }
});

// Get projects assigned to current user
router.get('/user/assigned', async (req, res, next) => {
  try {
    const Project = (await import('../models/Project.js')).default;
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;
    const projects = await Project.find({
      $or: [
        { manager: req.user._id },
        { team: req.user._id }
      ]
    })
      .populate('manager', 'firstName lastName employeeId')
      .populate('team', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Project.countDocuments({
      $or: [
        { manager: req.user._id },
        { team: req.user._id }
      ]
    });

    res.status(200).json({
      status: 'success',
      data: {
        projects,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
