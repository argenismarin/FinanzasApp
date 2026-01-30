import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma';

// Get JWT_SECRET - will be validated at runtime
const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not defined');
    }
    return secret;
};

const SALT_ROUNDS = 10;

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password, name } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Find user
        let user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            // Create new user
            if (!name) {
                return res.status(400).json({ error: 'Name is required for new users' });
            }

            // Hash password if provided
            const hashedPassword = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;

            user = await prisma.user.create({
                data: {
                    email,
                    name,
                    password: hashedPassword,
                    role: 'USER',
                    isActive: true,
                    settings: JSON.stringify({
                        currency: 'COP',
                        locale: 'es-CO',
                        theme: 'light'
                    })
                }
            });
        } else {
            // Existing user - verify password if they have one
            if (user.password) {
                if (!password) {
                    return res.status(401).json({ error: 'Password is required' });
                }
                const isValidPassword = await bcrypt.compare(password, user.password);
                if (!isValidPassword) {
                    return res.status(401).json({ error: 'Invalid password' });
                }
            }
        }

        if (!user.isActive) {
            return res.status(403).json({ error: 'User is not active' });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id },
            getJwtSecret(),
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                settings: user.settings
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const me = async (req: any, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                avatarUrl: true,
                settings: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
