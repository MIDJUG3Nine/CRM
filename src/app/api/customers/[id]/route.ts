import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CustomerStatus, CustomerIndustry } from '@prisma/client';

// Define the Task interface
interface Task {
  assignee?: {
    id: string;
    name: string;
    role: string;
  } | null;
}

// GET endpoint to fetch a single customer by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Use await to ensure params is properly resolved
    const customerId = params.id;
    
    // Fetch customer with related data
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        salesperson: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          },
          orderBy: {
            dueDate: 'asc'
          }
        },
        contactLogs: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          },
          orderBy: {
            date: 'desc'
          }
        }
      }
    });
    
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }
    
    // Check permissions
    // SALES can only view their own customers
    if (authUser.role === 'SALES' && customer.salespersonId !== authUser.userId) {
      return NextResponse.json(
        { error: 'Not authorized to view this customer' },
        { status: 403 }
      );
    }
    
    // DESIGNER can only view customers they have tasks for
    if (authUser.role === 'DESIGNER') {
      const hasAssignedTask = customer.tasks.some((task: Task) => task.assignee?.id === authUser.userId);
      if (!hasAssignedTask) {
        return NextResponse.json(
          { error: 'Not authorized to view this customer' },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

// PATCH endpoint to update a customer
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    });

    if (!customer) {
      return NextResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this customer
    const userRole = (session.user as any).role as string;
    const userId = (session.user as any).id as string;
    
    if (userRole !== 'ADMIN' && customer.salespersonId !== userId) {
      return NextResponse.json(
        { message: 'Not authorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      address,
      industry,
      status,
      requirements,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { message: 'Name is required' },
        { status: 400 }
      );
    }

    // Validate industry
    if (industry && !Object.values(CustomerIndustry).includes(industry)) {
      return NextResponse.json(
        { message: 'Invalid industry' },
        { status: 400 }
      );
    }

    // Validate status
    if (status && !Object.values(CustomerStatus).includes(status)) {
      return NextResponse.json(
        { message: 'Invalid status' },
        { status: 400 }
      );
    }

    // Update customer
    const updatedCustomer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        name,
        email,
        phone,
        address,
        industry,
        status,
        requirements,
      },
    });

    return NextResponse.json(updatedCustomer);
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a customer
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    });

    if (!customer) {
      return NextResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this customer
    const userRole = (session.user as any).role as string;
    const userId = (session.user as any).id as string;
    
    if (userRole !== 'ADMIN' && customer.salespersonId !== userId) {
      return NextResponse.json(
        { message: 'Not authorized' },
        { status: 403 }
      );
    }

    // Delete customer
    await prisma.customer.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 