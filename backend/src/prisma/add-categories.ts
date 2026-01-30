import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Nuevas categorías a agregar
const newCategories = [
    // Alimentación subcategorías
    { name: 'Supermercado', type: 'EXPENSE' as const, color: '#dc2626', icon: '🛒', isDefault: true },
    { name: 'Restaurantes', type: 'EXPENSE' as const, color: '#f97316', icon: '🍽️', isDefault: true },
    { name: 'Cafetería', type: 'EXPENSE' as const, color: '#6d28d9', icon: '☕', isDefault: true },

    // Transporte subcategorías
    { name: 'Gasolina', type: 'EXPENSE' as const, color: '#2563eb', icon: '⛽', isDefault: true },
    { name: 'Transporte Público', type: 'EXPENSE' as const, color: '#1d4ed8', icon: '🚌', isDefault: true },
    { name: 'Taxi/Uber', type: 'EXPENSE' as const, color: '#1e40af', icon: '🚕', isDefault: true },

    // Vivienda subcategorías
    { name: 'Arriendo', type: 'EXPENSE' as const, color: '#7c3aed', icon: '🏢', isDefault: true },
    { name: 'Internet/TV', type: 'EXPENSE' as const, color: '#ca8a04', icon: '📶', isDefault: true },
    { name: 'Telefonía', type: 'EXPENSE' as const, color: '#a16207', icon: '📱', isDefault: true },
    { name: 'Mantenimiento Hogar', type: 'EXPENSE' as const, color: '#854d0e', icon: '🔧', isDefault: true },
    { name: 'Muebles y Decoración', type: 'EXPENSE' as const, color: '#92400e', icon: '🛋️', isDefault: true },

    // Salud subcategorías
    { name: 'Medicamentos', type: 'EXPENSE' as const, color: '#059669', icon: '💊', isDefault: true },
    { name: 'Consultas Médicas', type: 'EXPENSE' as const, color: '#047857', icon: '🩺', isDefault: true },
    { name: 'Gimnasio', type: 'EXPENSE' as const, color: '#065f46', icon: '🏋️', isDefault: true },
    { name: 'Belleza y Cuidado', type: 'EXPENSE' as const, color: '#ec4899', icon: '💅', isDefault: true },
    { name: 'Peluquería', type: 'EXPENSE' as const, color: '#db2777', icon: '💇', isDefault: true },

    // Educación subcategorías
    { name: 'Cursos Online', type: 'EXPENSE' as const, color: '#0891b2', icon: '🎓', isDefault: true },
    { name: 'Libros', type: 'EXPENSE' as const, color: '#0e7490', icon: '📖', isDefault: true },
    { name: 'Colegio/Universidad', type: 'EXPENSE' as const, color: '#155e75', icon: '🏫', isDefault: true },

    // Entretenimiento subcategorías
    { name: 'Streaming', type: 'EXPENSE' as const, color: '#d97706', icon: '📺', isDefault: true },
    { name: 'Cine', type: 'EXPENSE' as const, color: '#b45309', icon: '🎬', isDefault: true },
    { name: 'Conciertos/Eventos', type: 'EXPENSE' as const, color: '#92400e', icon: '🎫', isDefault: true },
    { name: 'Videojuegos', type: 'EXPENSE' as const, color: '#78350f', icon: '🎯', isDefault: true },
    { name: 'Hobbies', type: 'EXPENSE' as const, color: '#451a03', icon: '🎨', isDefault: true },

    // Personal
    { name: 'Calzado', type: 'EXPENSE' as const, color: '#be185d', icon: '👟', isDefault: true },
    { name: 'Accesorios', type: 'EXPENSE' as const, color: '#9d174d', icon: '👜', isDefault: true },

    // Tecnología subcategorías
    { name: 'Software/Apps', type: 'EXPENSE' as const, color: '#4f46e5', icon: '📲', isDefault: true },
    { name: 'Electrónica', type: 'EXPENSE' as const, color: '#4338ca', icon: '🔌', isDefault: true },

    // Financieros
    { name: 'Seguros', type: 'EXPENSE' as const, color: '#0d9488', icon: '🛡️', isDefault: true },
    { name: 'Impuestos', type: 'EXPENSE' as const, color: '#115e59', icon: '🏛️', isDefault: true },
    { name: 'Comisiones Bancarias', type: 'EXPENSE' as const, color: '#134e4a', icon: '🏦', isDefault: true },
    { name: 'Intereses', type: 'EXPENSE' as const, color: '#042f2e', icon: '📊', isDefault: true },

    // Otros gastos nuevos
    { name: 'Mascotas', type: 'EXPENSE' as const, color: '#f472b6', icon: '🐕', isDefault: true },
    { name: 'Regalos', type: 'EXPENSE' as const, color: '#e879f9', icon: '🎁', isDefault: true },
    { name: 'Donaciones', type: 'EXPENSE' as const, color: '#c084fc', icon: '❤️', isDefault: true },
    { name: 'Suscripciones', type: 'EXPENSE' as const, color: '#a855f7', icon: '🔄', isDefault: true },
    { name: 'Viajes', type: 'EXPENSE' as const, color: '#8b5cf6', icon: '✈️', isDefault: true },
    { name: 'Vacaciones', type: 'EXPENSE' as const, color: '#7c3aed', icon: '🏖️', isDefault: true },
    { name: 'Alcohol/Fiestas', type: 'EXPENSE' as const, color: '#5b21b6', icon: '🍺', isDefault: true },

    // Nuevos ingresos
    { name: 'Bonificaciones', type: 'INCOME' as const, color: '#16a34a', icon: '🎉', isDefault: true },
    { name: 'Comisiones', type: 'INCOME' as const, color: '#15803d', icon: '💵', isDefault: true },
    { name: 'Negocio Propio', type: 'INCOME' as const, color: '#0d9488', icon: '🏪', isDefault: true },
    { name: 'Dividendos', type: 'INCOME' as const, color: '#0284c7', icon: '💹', isDefault: true },
    { name: 'Intereses Bancarios', type: 'INCOME' as const, color: '#0369a1', icon: '🏦', isDefault: true },
    { name: 'Arriendos', type: 'INCOME' as const, color: '#075985', icon: '🏠', isDefault: true },
    { name: 'Reembolsos', type: 'INCOME' as const, color: '#0c4a6e', icon: '↩️', isDefault: true },
    { name: 'Regalos Recibidos', type: 'INCOME' as const, color: '#84cc16', icon: '🎁', isDefault: true },
    { name: 'Venta de Items', type: 'INCOME' as const, color: '#65a30d', icon: '🛍️', isDefault: true },
];

async function addNewCategories() {
    console.log('🌱 Adding new categories to database...');

    let added = 0;
    let skipped = 0;

    for (const category of newCategories) {
        // Check if category already exists
        const existing = await prisma.category.findFirst({
            where: {
                name: category.name,
                type: category.type,
                userId: null // Solo categorías predeterminadas
            }
        });

        if (!existing) {
            await prisma.category.create({
                data: category
            });
            added++;
            console.log(`✅ Added: ${category.icon} ${category.name}`);
        } else {
            skipped++;
        }
    }

    console.log(`\n🎉 Done! Added ${added} categories, skipped ${skipped} (already existed)`);
}

addNewCategories()
    .catch((e) => {
        console.error('❌ Error adding categories:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
