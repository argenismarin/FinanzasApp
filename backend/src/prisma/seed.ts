import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Check if categories already exist
    const existingCategories = await prisma.category.count();

    if (existingCategories === 0) {
        // Create default categories
        await prisma.category.createMany({
            data: [
                // Expense categories
                { name: 'Alimentación', type: 'EXPENSE', color: '#ef4444', icon: '🍔', isDefault: true },
                { name: 'Transporte', type: 'EXPENSE', color: '#3b82f6', icon: '🚗', isDefault: true },
                { name: 'Vivienda', type: 'EXPENSE', color: '#8b5cf6', icon: '🏠', isDefault: true },
                { name: 'Servicios', type: 'EXPENSE', color: '#eab308', icon: '💡', isDefault: true },
                { name: 'Salud', type: 'EXPENSE', color: '#10b981', icon: '⚕️', isDefault: true },
                { name: 'Educación', type: 'EXPENSE', color: '#06b6d4', icon: '📚', isDefault: true },
                { name: 'Entretenimiento', type: 'EXPENSE', color: '#f59e0b', icon: '🎮', isDefault: true },
                { name: 'Ropa', type: 'EXPENSE', color: '#ec4899', icon: '👕', isDefault: true },
                { name: 'Tecnología', type: 'EXPENSE', color: '#6366f1', icon: '💻', isDefault: true },
                { name: 'Otros Gastos', type: 'EXPENSE', color: '#64748b', icon: '📦', isDefault: true },

                // Income categories
                { name: 'Salario', type: 'INCOME', color: '#22c55e', icon: '💰', isDefault: true },
                { name: 'Freelance', type: 'INCOME', color: '#14b8a6', icon: '💼', isDefault: true },
                { name: 'Inversiones', type: 'INCOME', color: '#0ea5e9', icon: '📈', isDefault: true },
                { name: 'Otros Ingresos', type: 'INCOME', color: '#84cc16', icon: '💵', isDefault: true },
            ]
        });
        console.log('✅ 14 default categories created');
    } else {
        console.log('ℹ️  Categories already exist, skipping...');
    }

    // Check if admin user exists
    const existingAdmin = await prisma.user.findUnique({
        where: { email: 'argenis.marin@example.com' }
    });

    if (!existingAdmin) {
        const adminUser = await prisma.user.create({
            data: {
                email: 'argenis.marin@example.com',
                name: 'Argenis David Marin Adames',
                role: 'ADMIN',
                isActive: true,
                settings: {
                    currency: 'COP',
                    locale: 'es-CO',
                    theme: 'light'
                }
            }
        });
        console.log('✅ Admin user created:', adminUser.email);
    } else {
        console.log('ℹ️  Admin user already exists, skipping...');
    }

    console.log('🎉 Seeding completed!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

