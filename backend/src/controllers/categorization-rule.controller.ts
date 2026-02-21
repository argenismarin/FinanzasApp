import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

export const getRules = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const rules = await prisma.categorizationRule.findMany({
            where: { userId },
            include: {
                category: {
                    select: { id: true, name: true, icon: true, color: true, type: true }
                }
            },
            orderBy: { priority: 'asc' }
        });
        res.json(rules);
    } catch (error) {
        console.error('Get rules error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createRule = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { categoryId, pattern, matchType, priority } = req.body;

        if (!categoryId || !pattern) {
            return res.status(400).json({ error: 'categoryId and pattern are required' });
        }

        const category = await prisma.category.findUnique({ where: { id: categoryId } });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const rule = await prisma.categorizationRule.create({
            data: {
                userId,
                categoryId,
                pattern: pattern.trim(),
                matchType: matchType || 'CONTAINS',
                priority: priority ?? 0
            },
            include: {
                category: {
                    select: { id: true, name: true, icon: true, color: true, type: true }
                }
            }
        });
        res.status(201).json(rule);
    } catch (error) {
        console.error('Create rule error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateRule = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;
        const { categoryId, pattern, matchType, priority, isActive } = req.body;

        const existing = await prisma.categorizationRule.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        const rule = await prisma.categorizationRule.update({
            where: { id },
            data: {
                ...(categoryId && { categoryId }),
                ...(pattern && { pattern: pattern.trim() }),
                ...(matchType && { matchType }),
                ...(priority !== undefined && { priority }),
                ...(isActive !== undefined && { isActive })
            },
            include: {
                category: {
                    select: { id: true, name: true, icon: true, color: true, type: true }
                }
            }
        });
        res.json(rule);
    } catch (error) {
        console.error('Update rule error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteRule = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const existing = await prisma.categorizationRule.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        await prisma.categorizationRule.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error('Delete rule error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const suggestCategory = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { description, type } = req.body;

        if (!description || description.length < 2) {
            return res.json({ suggestion: null });
        }

        const rules = await prisma.categorizationRule.findMany({
            where: { userId, isActive: true },
            include: {
                category: {
                    select: { id: true, name: true, icon: true, color: true, type: true }
                }
            },
            orderBy: { priority: 'asc' }
        });

        const filtered = type ? rules.filter(r => r.category.type === type) : rules;
        const descLower = description.toLowerCase();

        for (const rule of filtered) {
            const patternLower = rule.pattern.toLowerCase();
            let matched = false;

            switch (rule.matchType) {
                case 'CONTAINS':
                    matched = descLower.includes(patternLower);
                    break;
                case 'STARTS_WITH':
                    matched = descLower.startsWith(patternLower);
                    break;
                case 'EXACT':
                    matched = descLower === patternLower;
                    break;
            }

            if (matched) {
                return res.json({
                    suggestion: {
                        categoryId: rule.categoryId,
                        category: rule.category,
                        rule: { id: rule.id, pattern: rule.pattern, matchType: rule.matchType }
                    }
                });
            }
        }

        res.json({ suggestion: null });
    } catch (error) {
        console.error('Suggest category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
