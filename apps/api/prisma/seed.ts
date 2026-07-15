/**
 * Database seed script
 * Creates the admin plus sample clients, plans, and tracking data for local dev.
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

  // Clean existing data (order respects FK constraints)
  await prisma.aIMessage.deleteMany();
  await prisma.aIConversation.deleteMany();
  await prisma.aIDocument.deleteMany();
  await prisma.missedWorkoutCharge.deleteMany();
  await prisma.accountabilitySubscription.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.userRequest.deleteMany();
  await prisma.workoutCompletion.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.workoutDay.deleteMany();
  await prisma.workoutPlan.deleteMany();
  await prisma.foodLog.deleteMany();
  await prisma.mealPlan.deleteMany();
  await prisma.nutritionTarget.deleteMany();
  await prisma.weightLog.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.managerClient.deleteMany();
  await prisma.onboardingQuestionnaire.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.user.deleteMany();

  // Create the single Admin (you). Configurable via env so no personal
  // password lives in source control. Signing in with Google using this same
  // email also grants ADMIN (googleLogin matches by email and keeps the role).
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const adminPassword = await hashPassword(process.env.ADMIN_PASSWORD || 'ChangeMe!2026');
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: process.env.ADMIN_NAME || 'Coach',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log('✅ Created admin:', admin.email);

  // Client 1 — established, has plan + history
  const client1 = await prisma.user.create({
    data: {
      email: 'john@example.com',
      name: 'John Smith',
      passwordHash: await hashPassword('Client123!'),
      role: 'USER',
      clientProfile: {
        create: {
          height: 180,
          weight: 92,
          goal: 'Build muscle and lose fat',
          notes: 'Prefers morning workouts. Has slight knee issue.',
          timezone: 'America/New_York',
        },
      },
      onboarding: {
        create: {
          height: 180,
          weight: 92,
          age: 31,
          gender: 'male',
          fitnessExperience: 'intermediate',
          dailyWorkoutMinutes: 60,
          fitnessGoals: ['Build muscle', 'Lose fat'],
          injuries: 'Slight knee issue',
          dietaryRestrictions: [],
          equipment: ['Full gym'],
          activityLevel: 'moderately_active',
          completed: true,
          completedAt: new Date(),
        },
      },
    },
  });
  console.log('✅ Created client:', client1.email);

  // Client 2 — newer, vegetarian
  const client2 = await prisma.user.create({
    data: {
      email: 'sarah@example.com',
      name: 'Sarah Johnson',
      passwordHash: await hashPassword('Client123!'),
      role: 'USER',
      clientProfile: {
        create: {
          height: 165,
          weight: 68,
          goal: 'Improve overall fitness and energy',
          notes: 'Vegetarian. Training for a 5K.',
          timezone: 'America/Los_Angeles',
        },
      },
      onboarding: {
        create: {
          height: 165,
          weight: 68,
          age: 27,
          gender: 'female',
          fitnessExperience: 'beginner',
          dailyWorkoutMinutes: 45,
          fitnessGoals: ['Improve fitness', 'More energy'],
          dietaryRestrictions: ['Vegetarian'],
          equipment: ['Dumbbells', 'Resistance bands'],
          activityLevel: 'lightly_active',
          completed: true,
          completedAt: new Date(),
        },
      },
    },
  });
  console.log('✅ Created client:', client2.email);

  // Workout plan for Client 1 — Push/Pull/Legs
  await prisma.workoutPlan.create({
    data: {
      userId: client1.id,
      title: 'Push/Pull/Legs Split',
      active: true,
      workoutDays: {
        create: [
          {
            dayOfWeek: 1,
            title: 'Push Day',
            exercises: {
              create: [
                { name: 'Bench Press', sets: 4, reps: '8-10', restSeconds: 120, orderIndex: 0 },
                { name: 'Overhead Press', sets: 3, reps: '8-10', restSeconds: 90, orderIndex: 1 },
                { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', restSeconds: 90, orderIndex: 2 },
                { name: 'Lateral Raises', sets: 3, reps: '12-15', restSeconds: 60, orderIndex: 3 },
                { name: 'Tricep Pushdowns', sets: 3, reps: '12-15', restSeconds: 60, orderIndex: 4 },
              ],
            },
          },
          {
            dayOfWeek: 2,
            title: 'Pull Day',
            exercises: {
              create: [
                { name: 'Deadlift', sets: 4, reps: '5-6', restSeconds: 180, orderIndex: 0 },
                { name: 'Barbell Rows', sets: 4, reps: '8-10', restSeconds: 120, orderIndex: 1 },
                { name: 'Lat Pulldowns', sets: 3, reps: '10-12', restSeconds: 90, orderIndex: 2 },
                { name: 'Face Pulls', sets: 3, reps: '15-20', restSeconds: 60, orderIndex: 3 },
                { name: 'Bicep Curls', sets: 3, reps: '10-12', restSeconds: 60, orderIndex: 4 },
              ],
            },
          },
          {
            dayOfWeek: 4,
            title: 'Legs Day',
            exercises: {
              create: [
                { name: 'Squats', sets: 4, reps: '6-8', restSeconds: 180, notes: 'Go easy on the knees', orderIndex: 0 },
                { name: 'Romanian Deadlift', sets: 3, reps: '10-12', restSeconds: 120, orderIndex: 1 },
                { name: 'Leg Press', sets: 3, reps: '12-15', restSeconds: 90, orderIndex: 2 },
                { name: 'Leg Curls', sets: 3, reps: '12-15', restSeconds: 60, orderIndex: 3 },
                { name: 'Calf Raises', sets: 4, reps: '15-20', restSeconds: 60, orderIndex: 4 },
              ],
            },
          },
        ],
      },
    },
  });
  console.log('✅ Created workout plan for John');

  // Workout plan for Client 2 — Full Body
  await prisma.workoutPlan.create({
    data: {
      userId: client2.id,
      title: 'Full Body 3x/Week',
      active: true,
      workoutDays: {
        create: [
          {
            dayOfWeek: 1,
            title: 'Full Body A',
            exercises: {
              create: [
                { name: 'Goblet Squats', sets: 3, reps: '12-15', restSeconds: 90, orderIndex: 0 },
                { name: 'Push-ups', sets: 3, reps: '10-15', restSeconds: 60, orderIndex: 1 },
                { name: 'Dumbbell Rows', sets: 3, reps: '10-12', restSeconds: 60, orderIndex: 2 },
                { name: 'Lunges', sets: 3, reps: '10 each leg', restSeconds: 60, orderIndex: 3 },
                { name: 'Plank', sets: 3, reps: '30-45 sec', restSeconds: 45, orderIndex: 4 },
              ],
            },
          },
          {
            dayOfWeek: 3,
            title: 'Full Body B',
            exercises: {
              create: [
                { name: 'Romanian Deadlift', sets: 3, reps: '10-12', restSeconds: 90, orderIndex: 0 },
                { name: 'Dumbbell Bench Press', sets: 3, reps: '10-12', restSeconds: 60, orderIndex: 1 },
                { name: 'Lat Pulldown', sets: 3, reps: '10-12', restSeconds: 60, orderIndex: 2 },
                { name: 'Step-ups', sets: 3, reps: '10 each leg', restSeconds: 60, orderIndex: 3 },
                { name: 'Bird Dogs', sets: 3, reps: '10 each side', restSeconds: 45, orderIndex: 4 },
              ],
            },
          },
          {
            dayOfWeek: 5,
            title: 'Full Body C',
            exercises: {
              create: [
                { name: 'Sumo Squats', sets: 3, reps: '12-15', restSeconds: 90, orderIndex: 0 },
                { name: 'Overhead Press', sets: 3, reps: '10-12', restSeconds: 60, orderIndex: 1 },
                { name: 'Cable Rows', sets: 3, reps: '10-12', restSeconds: 60, orderIndex: 2 },
                { name: 'Glute Bridges', sets: 3, reps: '15-20', restSeconds: 60, orderIndex: 3 },
                { name: 'Dead Bug', sets: 3, reps: '10 each side', restSeconds: 45, orderIndex: 4 },
              ],
            },
          },
        ],
      },
    },
  });
  console.log('✅ Created workout plan for Sarah');

  // Nutrition targets
  await prisma.nutritionTarget.create({
    data: {
      userId: client1.id,
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
      userId: client2.id,
      calories: 1800,
      protein: 120,
      carbs: 200,
      fat: 60,
      waterLiters: 2.5,
      notes: 'Plant-based protein sources: tofu, tempeh, legumes, seitan.',
    },
  });
  console.log('✅ Created nutrition targets');

  // Weight logs (date must be unique per user per day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const baseWeight = 92 - (30 - i) * 0.1;
    const fluctuation = Math.random() * 0.6 - 0.3;
    await prisma.weightLog.create({
      data: {
        userId: client1.id,
        date,
        weight: Math.round((baseWeight + fluctuation) * 10) / 10,
        note: i % 7 === 0 ? 'Weekly weigh-in' : undefined,
      },
    });
  }
  console.log('✅ Created weight logs for John');

  for (let i = 14; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const fluctuation = Math.random() * 0.4 - 0.2;
    await prisma.weightLog.create({
      data: {
        userId: client2.id,
        date,
        weight: Math.round((68 + fluctuation) * 10) / 10,
      },
    });
  }
  console.log('✅ Created weight logs for Sarah');

  // Food logs for Client 1
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
        data: { userId: client1.id, date, ...food },
      });
    }
  }
  console.log('✅ Created food logs for John');

  // Workout completions for Client 1 (~80% adherence over 2 weeks)
  const workoutDays = await prisma.workoutDay.findMany({
    where: { workoutPlan: { userId: client1.id } },
  });
  for (let i = 14; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const matchingDay = workoutDays.find(d => d.dayOfWeek === date.getDay());
    if (matchingDay && Math.random() > 0.2) {
      await prisma.workoutCompletion.create({
        data: {
          userId: client1.id,
          workoutDayId: matchingDay.id,
          completedAt: date,
          durationMinutes: 45 + Math.floor(Math.random() * 30),
          feedback: Math.random() > 0.5 ? 'Felt strong today!' : undefined,
        },
      });
    }
  }
  console.log('✅ Created workout completions');

  // Weekly check-ins for Client 1
  for (let i = 4; i >= 0; i--) {
    const weekOf = new Date(today);
    weekOf.setDate(weekOf.getDate() - weekOf.getDay() - i * 7);
    await prisma.checkIn.create({
      data: {
        userId: client1.id,
        weekOf,
        energy: Math.floor(Math.random() * 3) + 7,
        sleepHours: Math.round((6.5 + Math.random() * 2) * 10) / 10,
        stress: Math.floor(Math.random() * 3) + 3,
        adherence: Math.floor(Math.random() * 2) + 8,
        notes: i === 0 ? 'Feeling good this week, energy levels are up!' : undefined,
      },
    });
  }
  console.log('✅ Created check-ins');

  // AI knowledge base document (used by the AI coach chat)
  await prisma.aIDocument.create({
    data: {
      title: 'Veggi Chikn Coaching Knowledge Base',
      type: 'KNOWLEDGE_BASE',
      content: `Coaching philosophy: consistency beats intensity. Progressive overload on compound lifts.
Protein target: ~1.6-2.2g per kg bodyweight. Vegetarian protein: tofu, tempeh, seitan, legumes, Greek yogurt, whey.
Rest 48h between training the same muscle group. Sleep 7-9 hours. Hydrate 2.5-3.5L daily.
Missed sessions on the accountability tier cost $10 — show up.`,
      active: true,
    },
  });
  console.log('✅ Created AI knowledge base');

  // Announcements
  await prisma.announcement.create({
    data: {
      title: 'Welcome to the portal',
      body: 'Your workout plan, meal plan, progress tracking, and the AI coach all live here. Questions? Send a request from the Requests tab.',
      audienceType: 'ALL',
    },
  });
  console.log('✅ Created announcements');

  // Resources
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
  console.log(`   Admin: ${adminEmail} / (ADMIN_PASSWORD from .env)`);
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
