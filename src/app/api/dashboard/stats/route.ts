import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

// Define the interface for task with customerId
interface TaskWithCustomerId {
  customerId: string | null;
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user using auth utility
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Fetch user to confirm they exist and are approved
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
    });

    if (!user || !user.isApproved) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Get total customers
    const totalCustomers = await prisma.customer.count();

    // Get task statistics
    const totalTasks = await prisma.task.count();
    const pendingTasks = await prisma.task.count({
      where: { status: 'PENDING' },
    });
    const completedTasks = await prisma.task.count({
      where: { status: 'COMPLETED' },
    });

    // Get recent contacts (limit to 5)
    // For non-admin users, only show contacts related to their role
    let recentContactsQuery: any = {
      take: 5,
      orderBy: { date: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    };

    // Filter contacts based on user role
    if (authUser.role !== 'ADMIN' && authUser.role !== 'PROJECT_MANAGER') {
      // Sales people only see their own contacts
      if (authUser.role === 'SALES') {
        recentContactsQuery.where = { userId: authUser.userId };
      }
      // Designers only see contacts for customers they're assigned to tasks for
      else if (authUser.role === 'DESIGNER') {
        const designerTaskCustomerIds = await prisma.task.findMany({
          where: { assigneeId: authUser.userId },
          select: { customerId: true },
          distinct: ['customerId'],
        });
        
        // Make sure we have customer IDs before filtering
        if (designerTaskCustomerIds.length > 0) {
          const customerIds = designerTaskCustomerIds
            .map((t: TaskWithCustomerId) => t.customerId)
            .filter((id: string | null): id is string => id !== null);
          
          // Only apply the filter if we have customer IDs
          if (customerIds.length > 0) {
            recentContactsQuery.where = {
              customerId: { in: customerIds },
            };
          } else {
            // If no customer IDs, return empty result
            recentContactsQuery.where = {
              id: 'none', // This will return no results
            };
          }
        } else {
          // If no tasks assigned, return empty result
          recentContactsQuery.where = {
            id: 'none', // This will return no results
          };
        }
      }
    }

    const recentContacts = await prisma.contactRecord.findMany(recentContactsQuery);

    // Return the stats in the expected format with a 'stats' wrapper
    return NextResponse.json({
      stats: {
        totalCustomers,
        totalTasks,
        pendingTasks,
        completedTasks,
        recentContacts,
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
} 