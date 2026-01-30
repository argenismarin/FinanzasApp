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
                // ===== EXPENSE CATEGORIES =====
                // Básicos
                { name: 'Alimentación', type: 'EXPENSE', color: '#ef4444', icon: '🍔', isDefault: true },
                { name: 'Supermercado', type: 'EXPENSE', color: '#dc2626', icon: '🛒', isDefault: true },
                { name: 'Restaurantes', type: 'EXPENSE', color: '#f97316', icon: '🍽️', isDefault: true },
                { name: 'Transporte', type: 'EXPENSE', color: '#3b82f6', icon: '🚗', isDefault: true },
                { name: 'Gasolina', type: 'EXPENSE', color: '#2563eb', icon: '⛽', isDefault: true },
                { name: 'Transporte Público', type: 'EXPENSE', color: '#1d4ed8', icon: '🚌', isDefault: true },
                { name: 'Taxi/Uber', type: 'EXPENSE', color: '#1e40af', icon: '🚕', isDefault: true },

                // Vivienda y Hogar
                { name: 'Vivienda', type: 'EXPENSE', color: '#8b5cf6', icon: '🏠', isDefault: true },
                { name: 'Arriendo', type: 'EXPENSE', color: '#7c3aed', icon: '🏢', isDefault: true },
                { name: 'Servicios Públicos', type: 'EXPENSE', color: '#eab308', icon: '💡', isDefault: true },
                { name: 'Internet/TV', type: 'EXPENSE', color: '#ca8a04', icon: '📶', isDefault: true },
                { name: 'Telefonía', type: 'EXPENSE', color: '#a16207', icon: '📱', isDefault: true },
                { name: 'Mantenimiento Hogar', type: 'EXPENSE', color: '#854d0e', icon: '🔧', isDefault: true },
                { name: 'Muebles y Decoración', type: 'EXPENSE', color: '#92400e', icon: '🛋️', isDefault: true },

                // Salud y Bienestar
                { name: 'Salud', type: 'EXPENSE', color: '#10b981', icon: '⚕️', isDefault: true },
                { name: 'Medicamentos', type: 'EXPENSE', color: '#059669', icon: '💊', isDefault: true },
                { name: 'Consultas Médicas', type: 'EXPENSE', color: '#047857', icon: '🩺', isDefault: true },
                { name: 'Gimnasio', type: 'EXPENSE', color: '#065f46', icon: '🏋️', isDefault: true },
                { name: 'Belleza y Cuidado', type: 'EXPENSE', color: '#ec4899', icon: '💅', isDefault: true },
                { name: 'Peluquería', type: 'EXPENSE', color: '#db2777', icon: '💇', isDefault: true },

                // Educación
                { name: 'Educación', type: 'EXPENSE', color: '#06b6d4', icon: '📚', isDefault: true },
                { name: 'Cursos Online', type: 'EXPENSE', color: '#0891b2', icon: '🎓', isDefault: true },
                { name: 'Libros', type: 'EXPENSE', color: '#0e7490', icon: '📖', isDefault: true },
                { name: 'Colegio/Universidad', type: 'EXPENSE', color: '#155e75', icon: '🏫', isDefault: true },

                // Entretenimiento
                { name: 'Entretenimiento', type: 'EXPENSE', color: '#f59e0b', icon: '🎮', isDefault: true },
                { name: 'Streaming', type: 'EXPENSE', color: '#d97706', icon: '📺', isDefault: true },
                { name: 'Cine', type: 'EXPENSE', color: '#b45309', icon: '🎬', isDefault: true },
                { name: 'Conciertos/Eventos', type: 'EXPENSE', color: '#92400e', icon: '🎫', isDefault: true },
                { name: 'Videojuegos', type: 'EXPENSE', color: '#78350f', icon: '🎯', isDefault: true },
                { name: 'Hobbies', type: 'EXPENSE', color: '#451a03', icon: '🎨', isDefault: true },

                // Personal
                { name: 'Ropa', type: 'EXPENSE', color: '#ec4899', icon: '👕', isDefault: true },
                { name: 'Calzado', type: 'EXPENSE', color: '#be185d', icon: '👟', isDefault: true },
                { name: 'Accesorios', type: 'EXPENSE', color: '#9d174d', icon: '👜', isDefault: true },

                // Tecnología
                { name: 'Tecnología', type: 'EXPENSE', color: '#6366f1', icon: '💻', isDefault: true },
                { name: 'Software/Apps', type: 'EXPENSE', color: '#4f46e5', icon: '📲', isDefault: true },
                { name: 'Electrónica', type: 'EXPENSE', color: '#4338ca', icon: '🔌', isDefault: true },

                // Financieros
                { name: 'Seguros', type: 'EXPENSE', color: '#0d9488', icon: '🛡️', isDefault: true },
                { name: 'Impuestos', type: 'EXPENSE', color: '#115e59', icon: '🏛️', isDefault: true },
                { name: 'Comisiones Bancarias', type: 'EXPENSE', color: '#134e4a', icon: '🏦', isDefault: true },
                { name: 'Intereses', type: 'EXPENSE', color: '#042f2e', icon: '📊', isDefault: true },

                // Otros
                { name: 'Mascotas', type: 'EXPENSE', color: '#f472b6', icon: '🐕', isDefault: true },
                { name: 'Regalos', type: 'EXPENSE', color: '#e879f9', icon: '🎁', isDefault: true },
                { name: 'Donaciones', type: 'EXPENSE', color: '#c084fc', icon: '❤️', isDefault: true },
                { name: 'Suscripciones', type: 'EXPENSE', color: '#a855f7', icon: '🔄', isDefault: true },
                { name: 'Viajes', type: 'EXPENSE', color: '#8b5cf6', icon: '✈️', isDefault: true },
                { name: 'Vacaciones', type: 'EXPENSE', color: '#7c3aed', icon: '🏖️', isDefault: true },
                { name: 'Cafetería', type: 'EXPENSE', color: '#6d28d9', icon: '☕', isDefault: true },
                { name: 'Alcohol/Fiestas', type: 'EXPENSE', color: '#5b21b6', icon: '🍺', isDefault: true },
                { name: 'Deudas', type: 'EXPENSE', color: '#4c1d95', icon: '💳', isDefault: true },
                { name: 'Pago de Deuda', type: 'EXPENSE', color: '#991b1b', icon: '💳', isDefault: true },
                { name: 'Otros Gastos', type: 'EXPENSE', color: '#64748b', icon: '📦', isDefault: true },

                // ===== INCOME CATEGORIES =====
                { name: 'Salario', type: 'INCOME', color: '#22c55e', icon: '💰', isDefault: true },
                { name: 'Bonificaciones', type: 'INCOME', color: '#16a34a', icon: '🎉', isDefault: true },
                { name: 'Comisiones', type: 'INCOME', color: '#15803d', icon: '💵', isDefault: true },
                { name: 'Freelance', type: 'INCOME', color: '#14b8a6', icon: '💼', isDefault: true },
                { name: 'Negocio Propio', type: 'INCOME', color: '#0d9488', icon: '🏪', isDefault: true },
                { name: 'Inversiones', type: 'INCOME', color: '#0ea5e9', icon: '📈', isDefault: true },
                { name: 'Dividendos', type: 'INCOME', color: '#0284c7', icon: '💹', isDefault: true },
                { name: 'Intereses Bancarios', type: 'INCOME', color: '#0369a1', icon: '🏦', isDefault: true },
                { name: 'Arriendos', type: 'INCOME', color: '#075985', icon: '🏠', isDefault: true },
                { name: 'Reembolsos', type: 'INCOME', color: '#0c4a6e', icon: '↩️', isDefault: true },
                { name: 'Regalos Recibidos', type: 'INCOME', color: '#84cc16', icon: '🎁', isDefault: true },
                { name: 'Venta de Items', type: 'INCOME', color: '#65a30d', icon: '🛍️', isDefault: true },
                { name: 'Otros Ingresos', type: 'INCOME', color: '#4d7c0f', icon: '💵', isDefault: true },
            ]
        });
        console.log('✅ 62 default categories created');
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
                settings: JSON.stringify({
                    currency: 'COP',
                    locale: 'es-CO',
                    theme: 'light'
                })
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

