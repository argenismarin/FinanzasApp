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
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        if (!user.password) {
            return res.status(401).json({ error: 'Contraseña no configurada. Regístrate nuevamente.' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        if (!user.isActive) {
            return res.status(403).json({ error: 'Usuario inactivo' });
        }

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
    } catch (error: any) {
        console.error('Login error:', error);
        if (error.message?.includes('JWT_SECRET')) {
            res.status(500).json({ error: 'Error de configuración del servidor' });
        } else if (error.code === 'P2021') {
            res.status(500).json({ error: 'Error de base de datos. Ejecuta las migraciones.' });
        } else if (error.code === 'P2010' || error.code === 'P1001' || error.code === 'P1002') {
            res.status(500).json({ error: 'Error de conexión a la base de datos' });
        } else {
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
};

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
        }

        const existing = await prisma.user.findUnique({
            where: { email }
        });

        if (existing && existing.password) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        let user;
        if (existing && !existing.password) {
            user = await prisma.user.update({
                where: { email },
                data: { password: hashedPassword, name }
            });
        } else {
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
        }

        // Auto-create "General" bank account for new user
        const existingAccount = await prisma.bankAccount.findFirst({
            where: { userId: user.id, name: 'General' }
        });
        if (!existingAccount) {
            await prisma.bankAccount.create({
                data: {
                    userId: user.id,
                    name: 'General',
                    type: 'CHECKING',
                    balance: 0,
                    currency: 'COP',
                    isActive: true,
                }
            });
        }

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
    } catch (error: any) {
        console.error('Register error:', error);
        if (error.message?.includes('JWT_SECRET')) {
            res.status(500).json({ error: 'Error de configuración del servidor' });
        } else if (error.code === 'P2002') {
            res.status(400).json({ error: 'El email ya está registrado' });
        } else if (error.code === 'P2021') {
            res.status(500).json({ error: 'Error de base de datos. Ejecuta las migraciones.' });
        } else if (error.code === 'P2010' || error.code === 'P1001' || error.code === 'P1002') {
            res.status(500).json({ error: 'Error de conexión a la base de datos' });
        } else {
            res.status(500).json({ error: 'Error interno del servidor' });
        }
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
