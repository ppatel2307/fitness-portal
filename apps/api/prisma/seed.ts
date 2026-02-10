/**
 * Database seed script
 * Creates sample admin, clients, and data for testing
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.workoutCompletion.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.workoutDay.deleteMany();
  await prisma.workoutPlan.deleteMany();
  await prisma.foodLog.deleteMany();
  await prisma.nutritionTarget.deleteMany();
  await prisma.weightLog.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.user.deleteMany();

  // Create Admin
  const adminPassword = await hashPassword('Admin123!');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@fitportal.com',
      name: 'Coach Mike',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log('✅ Created admin:', admin.email);

  // Create Client 1 - Active, has workout plan
  const client1Password = await hashPassword('Client123!');
  const client1 = await prisma.user.create({
    data: {
      email: 'john@example.com',
      name: 'John Smith',
      passwordHash: client1Password,
      role: 'CLIENT',
      clientProfile: {
        create: {
          height: 180,
          goal: 'Build muscle and lose fat',
          notes: 'Prefers morning workouts. Has slight knee issue.',
          timezone: 'America/New_York',
        },
      },
    },
  });
  console.log('✅ Created client:', client1.email);

  // Create Client 2 - Active, newer client
  const client2Password = await hashPassword('Client123!');
  const client2 = await prisma.user.create({
    data: {
      email: 'sarah@example.com',
      name: 'Sarah Johnson',
      passwordHash: client2Password,
      role: 'CLIENT',
      clientProfile: {
        create: {
          height: 165,
          goal: 'Improve overall fitness and energy',
          notes: 'Vegetarian. Training for a 5K.',
          timezone: 'America/Los_Angeles',
        },
      },
    },
  });
  console.log('✅ Created client:', client2.email);

  // Create Workout Plan for Client 1 - Push/Pull/Legs
  const workoutPlan1 = await prisma.workoutPlan.create({
    data: {
      clientId: client1.id,
      title: 'Push/Pull/Legs Split',
      active: true,
      workoutDays: {
        create: [
          {
            dayOfWeek: 1, // Monday
            title: 'Push Day',
            exercises: {
              create: [
                { name: 'Bench Press', sets: 4, reps: '8-10', rpe: 8, restSeconds: 120, orderIndex: 0 },
                { name: 'Overhead Press', sets: 3, reps: '8-10', rpe: 7, restSeconds: 90, orderIndex: 1 },
                { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rpe: 7, restSeconds: 90, orderIndex: 2 },
                { name: 'Lateral Raises', sets: 3, reps: '12-15', rpe: 8, restSeconds: 60, orderIndex: 3 },
                { name: 'Tricep Pushdowns', sets: 3, reps: '12-15', rpe: 7, restSeconds: 60, orderIndex: 4 },
              ],
            },
          },
          {
            dayOfWeek: 2, // Tuesday
            title: 'Pull Day',
            exercises: {
              create: [
                { name: 'Deadlift', sets: 4, reps: '5-6', rpe: 8, restSeconds: 180, orderIndex: 0 },
                { name: 'Barbell Rows', sets: 4, reps: '8-10', rpe: 7, restSeconds: 120, orderIndex: 1 },
                { name: 'Lat Pulldowns', sets: 3, reps: '10-12', rpe: 7, restSeconds: 90, orderIndex: 2 },
                { name: 'Face Pulls', sets: 3, reps: '15-20', rpe: 7, restSeconds: 60, orderIndex: 3 },
                { name: 'Bicep Curls', sets: 3, reps: '10-12', rpe: 7, restSeconds: 60, orderIndex: 4 },
              ],
            },
          },
          {
            dayOfWeek: 4, // Thursday
            title: 'Legs Day',
            exercises: {
              create: [
                { name: 'Squats', sets: 4, reps: '6-8', rpe: 8, restSeconds: 180, notes: 'Go easy on the knees', orderIndex: 0 },
                { name: 'Romanian Deadlift', sets: 3, reps: '10-12', rpe: 7, restSeconds: 120, orderIndex: 1 },
                { name: 'Leg Press', sets: 3, reps: '12-15', rpe: 7, restSeconds: 90, orderIndex: 2 },
                { name: 'Leg Curls', sets: 3, reps: '12-15', rpe: 7, restSeconds: 60, orderIndex: 3 },
                { name: 'Calf Raises', sets: 4, reps: '15-20', rpe: 8, restSeconds: 60, orderIndex: 4 },
              ],
            },
          },
        ],
      },
    },
  });
  console.log('✅ Created workout plan for John');

  // Create Workout Plan for Client 2 - Full Body
  const workoutPlan2 = await prisma.workoutPlan.create({
    data: {
      clientId: client2.id,
      title: 'Full Body 3x/Week',
      active: true,
      workoutDays: {
        create: [
          {
            dayOfWeek: 1, // Monday
            title: 'Full Body A',
            exercises: {
              create: [
                { name: 'Goblet Squats', sets: 3, reps: '12-15', rpe: 7, restSeconds: 90, orderIndex: 0 },
                { name: 'Push-ups', sets: 3, reps: '10-15', rpe: 7, restSeconds: 60, orderIndex: 1 },
                { name: 'Dumbbell Rows', sets: 3, reps: '10-12', rpe: 7, restSeconds: 60, orderIndex: 2 },
                { name: 'Lunges', sets: 3, reps: '10 each leg', rpe: 7, restSeconds: 60, orderIndex: 3 },
                { name: 'Plank', sets: 3, reps: '30-45 sec', rpe: 7, restSeconds: 45, orderIndex: 4 },
              ],
            },
          },
          {
            dayOfWeek: 3, // Wednesday
            title: 'Full Body B',
            exercises: {
              create: [
                { name: 'Romanian Deadlift', sets: 3, reps: '10-12', rpe: 7, restSeconds: 90, orderIndex: 0 },
                { name: 'Dumbbell Bench Press', sets: 3, reps: '10-12', rpe: 7, restSeconds: 60, orderIndex: 1 },
                { name: 'Lat Pulldown', sets: 3, reps: '10-12', rpe: 7, restSeconds: 60, orderIndex: 2 },
                { name: 'Step-ups', sets: 3, reps: '10 each leg', rpe: 7, restSeconds: 60, orderIndex: 3 },
                { name: 'Bird Dogs', sets: 3, reps: '10 each side', rpe: 6, restSeconds: 45, orderIndex: 4 },
              ],
            },
          },
          {
            dayOfWeek: 5, // Friday
            title: 'Full Body C',
            exercises: {
              create: [
                { name: 'Sumo Squats', sets: 3, reps: '12-15', rpe: 7, restSeconds: 90, orderIndex: 0 },
                { name: 'Overhead Press', sets: 3, reps: '10-12', rpe: 7, restSeconds: 60, orderIndex: 1 },
                { name: 'Cable Rows', sets: 3, reps: '10-12', rpe: 7, restSeconds: 60, orderIndex: 2 },
                { name: 'Glute Bridges', sets: 3, reps: '15-20', rpe: 7, restSeconds: 60, orderIndex: 3 },
                { name: 'Dead Bug', sets: 3, reps: '10 each side', rpe: 6, restSeconds: 45, orderIndex: 4 },
              ],
            },
          },
        ],
      },
    },
  });
  console.log('✅ Created workout plan for Sarah');

  // Create Nutrition Targets
  await prisma.nutritionTarget.create({
    data: {
      clientId: client1.id,
      calories: 2500,
      protein: 180,
      carbs: 250,
      fat: 80,
      waterLiters: 3.0,
      notes: 'Focus on getting protein with each meal. Pre-workout carbs important.',
    },
  });

  await prisma.nutritionTarget.create({
    data: {
      clientId: client2.id,
      calories: 1800,
      protein: 120,
      carbs: 200,
      fat: 60,
      waterLiters: 2.5,
      notes: 'Plant-based protein sources: tofu, tempeh, legumes, seitan.',
    },
  });
  console.log('✅ Created nutrition targets');

  // Create sample weight logs for Client 1
  const today = new Date();
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Simulate gradual weight loss with some fluctuation
    const baseWeight = 92 - (30 - i) * 0.1;
    const fluctuation = Math.random() * 0.6 - 0.3;
    
    await prisma.weightLog.create({
      data: {
        clientId: client1.id,
        date: date,
        weight: Math.round((baseWeight + fluctuation) * 10) / 10,
        note: i % 7 === 0 ? 'Weekly weigh-in' : undefined,
      },
    });
  }
  console.log('✅ Created weight logs for John');

  // Create sample weight logs for Client 2
  for (let i = 14; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const baseWeight = 68;
    const fluctuation = Math.random() * 0.4 - 0.2;
    
    await prisma.weightLog.create({
      data: {
        clientId: client2.id,
        date: date,
        weight: Math.round((baseWeight + fluctuation) * 10) / 10,
      },
    });
  }
  console.log('✅ Created weight logs for Sarah');

  // Create sample food logs for Client 1
  const foods = [
    { mealName: 'Breakfast - Oatmeal with protein', calories: 450, protein: 35, carbs: 55, fat: 12 },
    { mealName: 'Lunch - Chicken salad', calories: 650, protein: 45, carbs: 35, fat: 28 },
    { mealName: 'Pre-workout - Banana & shake', calories: 350, protein: 30, carbs: 45, fat: 5 },
    { mealName: 'Dinner - Salmon with rice', calories: 700, protein: 50, carbs: 60, fat: 25 },
    { mealName: 'Snack - Greek yogurt', calories: 200, protein: 20, carbs: 15, fat: 8 },
  ];

  for (let i = 7; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    for (const food of foods) {
      await prisma.foodLog.create({
        data: {
          clientId: client1.id,
          date: date,
          ...food,
        },
      });
    }
  }
  console.log('✅ Created food logs for John');

  // Create workout completions
  const workoutDays = await prisma.workoutDay.findMany({
    where: { workoutPlan: { clientId: client1.id } },
  });

  for (let i = 14; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Complete workouts on their scheduled days
    const dayOfWeek = date.getDay();
    const matchingDay = workoutDays.find((d) => d.dayOfWeek === dayOfWeek);
    
    if (matchingDay && Math.random() > 0.2) {
      // 80% completion rate
      await prisma.workoutCompletion.create({
        data: {
          clientId: client1.id,
          workoutDayId: matchingDay.id,
          completedAt: date,
          comment: Math.random() > 0.5 ? 'Felt strong today!' : undefined,
        },
      });
    }
  }
  console.log('✅ Created workout completions');

  // Create check-ins
  for (let i = 4; i >= 0; i--) {
    const weekOf = new Date(today);
    weekOf.setDate(weekOf.getDate() - weekOf.getDay() - i * 7);
    
    await prisma.checkIn.create({
      data: {
        clientId: client1.id,
        weekOf: weekOf,
        energy: Math.floor(Math.random() * 3) + 7, // 7-9
        sleepHours: 6.5 + Math.random() * 2,
        stress: Math.floor(Math.random() * 3) + 3, // 3-5
        adherence: Math.floor(Math.random() * 2) + 8, // 8-9
        notes: i === 0 ? 'Feeling good this week, energy levels are up!' : undefined,
      },
    });
  }
  console.log('✅ Created check-ins');

  // Create announcements
  await prisma.announcement.create({
    data: {
      title: 'Holiday Schedule Update',
      body: 'The gym will have reduced hours during the holiday season. Please check the schedule for specific times. All online coaching continues as normal!',
      audienceType: 'ALL',
    },
  });

  await prisma.announcement.create({
    data: {
      title: 'New Nutrition Guide Available',
      body: 'I\'ve uploaded a new guide on meal prep strategies. Check the Resources section for the PDF!',
      audienceType: 'ALL',
    },
  });
  console.log('✅ Created announcements');

  // Create resources
  await prisma.resource.create({
    data: {
      title: 'Proper Squat Form Guide',
      description: 'Video guide covering squat mechanics, common mistakes, and corrections.',
      url: 'https://example.com/squat-guide',
      category: 'FORM',
    },
  });

  await prisma.resource.create({
    data: {
      title: 'Macro Counting 101',
      description: 'Beginner guide to tracking macronutrients for your fitness goals.',
      url: 'https://example.com/macro-guide',
      category: 'NUTRITION',
    },
  });

  await prisma.resource.create({
    data: {
      title: 'Building Consistency',
      description: 'Tips for staying motivated and building lasting fitness habits.',
      url: 'https://example.com/mindset-guide',
      category: 'MINDSET',
    },
  });
  console.log('✅ Created resources');

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('📧 Login credentials:');
  console.log('   Admin: admin@fitportal.com / Admin123!');
  console.log('   Client 1: john@example.com / Client123!');
  console.log('   Client 2: sarah@example.com / Client123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
