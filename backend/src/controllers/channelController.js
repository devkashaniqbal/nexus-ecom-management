import Channel from '../models/Channel.js';
import Message from '../models/Message.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import notificationService from '../services/notificationService.js';
import socketService from '../services/socketService.js';

export const createChannel = async (req, res) => {
  try {
    const { name, description, workspaceId, teamId, type, members } = req.body;

    const channelMembers = [{
      user: req.user._id,
      role: 'admin',
      joinedAt: new Date()
    }];

    if (members && members.length > 0) {
      for (const memberId of members) {
        if (memberId !== req.user._id.toString()) {
          channelMembers.push({
            user: memberId,
            role: 'member',
            joinedAt: new Date()
          });
        }
      }
    }

    const channel = await Channel.create({
      name,
      description,
      workspace: workspaceId,
      team: teamId || null,
      type: type || 'public',
      members: channelMembers,
      createdBy: req.user._id
    });

    if (teamId) {
      await Team.findByIdAndUpdate(teamId, { $push: { channels: channel._id } });
    }

    socketService.emitToWorkspace(workspaceId, 'channel:created', { channel });

    res.status(201).json({ status: 'success', data: { channel } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getChannels = async (req, res) => {
  try {
    const { workspaceId, teamId } = req.query;

    // Validate workspaceId if provided
    if (workspaceId && !workspaceId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ status: 'error', message: 'Invalid workspace ID' });
    }

    const query = { isDeleted: false };
    if (workspaceId) query.workspace = workspaceId;
    if (teamId) query.team = teamId;

    // Only add the $or condition if user exists
    if (req.user && req.user._id) {
      query.$or = [
        { type: 'public' },
        { 'members.user': req.user._id }
      ];
    } else {
      query.type = 'public';
    }

    const channels = await Channel.find(query)
      .populate('team', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('members.user', 'firstName lastName profileImage')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ status: 'success', data: { channels: channels || [] } });
  } catch (error) {
    console.error('getChannels error:', error.stack || error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getChannel = async (req, res) => {
  try {
    const channel = await Channel.findOne({ _id: req.params.id, isDeleted: false })
      .populate('members.user', 'firstName lastName email profileImage')
      .populate('team', 'name')
      .populate('pinnedMessages');

    if (!channel) {
      return res.status(404).json({ status: 'error', message: 'Channel not found' });
    }

    if (channel.type === 'private' && !channel.isMember(req.user._id)) {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    res.json({ status: 'success', data: { channel } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateChannel = async (req, res) => {
  try {
    const { name, description, settings } = req.body;

    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ status: 'error', message: 'Channel not found' });
    }

    const member = channel.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Only channel admins can update' });
    }

    if (name) channel.name = name;
    if (description !== undefined) channel.description = description;
    if (settings) channel.settings = { ...channel.settings.toObject(), ...settings };

    await channel.save();

    socketService.emitToChannel(channel._id, 'channel:updated', { channel });

    res.json({ status: 'success', data: { channel } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteChannel = async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ status: 'error', message: 'Channel not found' });
    }

    const member = channel.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Only channel admins can delete' });
    }

    channel.isDeleted = true;
    channel.deletedAt = new Date();
    await channel.save();

    if (channel.team) {
      await Team.findByIdAndUpdate(channel.team, { $pull: { channels: channel._id } });
    }

    socketService.emitToChannel(channel._id, 'channel:deleted', { channelId: channel._id });

    res.json({ status: 'success', message: 'Channel deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const joinChannel = async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ status: 'error', message: 'Channel not found' });
    }

    if (channel.type !== 'public') {
      return res.status(403).json({ status: 'error', message: 'Cannot join private channel' });
    }

    if (channel.isMember(req.user._id)) {
      return res.status(400).json({ status: 'error', message: 'Already a member' });
    }

    channel.members.push({
      user: req.user._id,
      role: 'member',
      joinedAt: new Date()
    });
    await channel.save();

    socketService.emitToChannel(channel._id, 'channel:memberJoined', { channelId: channel._id, user: req.user });

    res.json({ status: 'success', message: 'Joined channel successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const leaveChannel = async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ status: 'error', message: 'Channel not found' });
    }

    const memberIndex = channel.members.findIndex(m => m.user.toString() === req.user._id.toString());
    if (memberIndex === -1) {
      return res.status(400).json({ status: 'error', message: 'Not a member' });
    }

    channel.members.splice(memberIndex, 1);
    await channel.save();

    socketService.emitToChannel(channel._id, 'channel:memberLeft', { channelId: channel._id, userId: req.user._id });

    res.json({ status: 'success', message: 'Left channel successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const addChannelMember = async (req, res) => {
  try {
    const { userId } = req.body;

    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ status: 'error', message: 'Channel not found' });
    }

    const member = channel.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Only admins can add members' });
    }

    if (channel.isMember(userId)) {
      return res.status(400).json({ status: 'error', message: 'User is already a member' });
    }

    const user = await User.findById(userId).select('firstName lastName');

    channel.members.push({
      user: userId,
      role: 'member',
      joinedAt: new Date()
    });
    await channel.save();

    socketService.emitToChannel(channel._id, 'channel:memberAdded', { channelId: channel._id, member: user });

    res.json({ status: 'success', message: 'Member added successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { content, type, attachments, mentions, parentId, linkedTaskId } = req.body;

    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ status: 'error', message: 'Channel not found' });
    }

    if (!channel.isMember(req.user._id)) {
      return res.status(403).json({ status: 'error', message: 'Not a member of this channel' });
    }

    const message = await Message.create({
      content,
      channel: channel._id,
      workspace: channel.workspace,
      sender: req.user._id,
      type: type || 'text',
      parent: parentId || null,
      mentions: mentions || [],
      attachments: attachments || [],
      linkedTask: linkedTaskId || null
    });

    await message.populate('sender', 'firstName lastName profileImage');

    const recipientIds = channel.members
      .filter(m => !m.isMuted)
      .map(m => m.user);

    await notificationService.notifyNewMessage(message, channel, req.user, recipientIds);

    socketService.emitToChannel(channel._id, 'message:new', { message });

    res.status(201).json({ status: 'success', data: { message } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { before, limit = 50 } = req.query;

    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ status: 'error', message: 'Channel not found' });
    }

    if (!channel.isMember(req.user._id) && channel.type !== 'public') {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    const query = { channel: channel._id, isDeleted: false, parent: null };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('sender', 'firstName lastName profileImage')
      .populate('linkedTask', 'title taskId status')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const member = channel.members.find(m => m.user.toString() === req.user._id.toString());
    if (member) {
      member.lastReadAt = new Date();
      await channel.save();
    }

    res.json({ status: 'success', data: { messages: messages.reverse() } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { content } = req.body;

    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ status: 'error', message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'error', message: 'Can only edit your own messages' });
    }

    message.editHistory.push({ content: message.content, editedAt: new Date() });
    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    socketService.emitToChannel(message.channel, 'message:edited', { message });

    res.json({ status: 'success', data: { message } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ status: 'error', message: 'Message not found' });
    }

    const channel = await Channel.findById(message.channel);
    const member = channel.members.find(m => m.user.toString() === req.user._id.toString());

    if (message.sender.toString() !== req.user._id.toString() && member?.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Permission denied' });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = req.user._id;
    await message.save();

    socketService.emitToChannel(message.channel, 'message:deleted', { messageId: message._id });

    res.json({ status: 'success', message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const addReaction = async (req, res) => {
  try {
    const { emoji } = req.body;

    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ status: 'error', message: 'Message not found' });
    }

    await message.addReaction(emoji, req.user._id);

    socketService.emitToChannel(message.channel, 'message:reaction', { messageId: message._id, emoji, userId: req.user._id, action: 'add' });

    res.json({ status: 'success', data: { message } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const removeReaction = async (req, res) => {
  try {
    const { emoji } = req.body;

    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ status: 'error', message: 'Message not found' });
    }

    await message.removeReaction(emoji, req.user._id);

    socketService.emitToChannel(message.channel, 'message:reaction', { messageId: message._id, emoji, userId: req.user._id, action: 'remove' });

    res.json({ status: 'success', data: { message } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getOrCreateDirect = async (req, res) => {
  try {
    const { userId, workspaceId } = req.body;

    const channel = await Channel.getOrCreateDirect(workspaceId, [req.user._id.toString(), userId]);

    await channel.populate('members.user', 'firstName lastName profileImage');

    res.json({ status: 'success', data: { channel } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ status: 'error', message: 'Channel not found' });
    }

    const member = channel.members.find(m => m.user.toString() === req.user._id.toString());
    if (member) {
      member.lastReadAt = new Date();
      await channel.save();
    }

    res.json({ status: 'success', message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
