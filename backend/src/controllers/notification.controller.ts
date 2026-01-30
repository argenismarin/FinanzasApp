import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { NotificationService } from '../services/notification.service';

interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

// Get all notifications for user
export const getNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { unreadOnly } = req.query;

        const where: any = { userId };
        if (unreadOnly === 'true') {
            where.isRead = false;
        }

        const notifications = await prisma.notification.findMany({
            where,
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' }
            ],
            take: 50 // Limit to last 50
        });

        const unreadCount = await prisma.notification.count({
            where: { userId, isRead: false }
        });

        res.json({
            notifications,
            unreadCount
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Mark notification as read
export const markAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        const notification = await prisma.notification.findFirst({
            where: { id, userId }
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        const updated = await prisma.notification.update({
            where: { id },
            data: {
                isRead: true,
                readAt: new Date()
            }
        });

        res.json(updated);
    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Mark all as read
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: {
                isRead: true,
                readAt: new Date()
            }
        });

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete notification
export const deleteNotification = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        const notification = await prisma.notification.findFirst({
            where: { id, userId }
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        await prisma.notification.delete({
            where: { id }
        });

        res.json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Run notification checks
export const runChecks = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        await NotificationService.runAllChecks(userId);

        const unreadCount = await prisma.notification.count({
            where: { userId, isRead: false }
        });

        res.json({ 
            message: 'Checks completed',
            unreadCount 
        });
    } catch (error) {
        console.error('Run checks error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get unread count
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const count = await prisma.notification.count({
            where: { userId, isRead: false }
        });

        res.json({ count });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

