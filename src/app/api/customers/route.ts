import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

// GET endpoint to fetch customers with pagination, search, and filtering
export async function GET(request: Request) {
  try {
    // Get authenticated user
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Parse URL and get search parameters
    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Search and filtering parameters
    const search = searchParams.get('search') || '';
    const industry = searchParams.get('industry') || undefined;
    const status = searchParams.get('status') || undefined;
    
    // Sorting parameters
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    
    // Build the where clause for filtering
    const where: any = {};
    
    // Add search condition if provided
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }
    
    // Add industry filter if provided
    if (industry) {
      where.industry = industry;
    }
    
    // Add status filter if provided
    if (status) {
      where.status = status;
    }
    
    // For sales users, only show their assigned customers
    if (authUser.role === 'SALES') {
      where.salespersonId = authUser.userId;
    }
    
    // For designers, show customers they have tasks for
    if (authUser.role === 'DESIGNER') {
      where.tasks = {
        some: {
          assigneeId: authUser.userId
        }
      };
    }
    
    // Fetch customers with pagination
    const customers = await prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder
      },
      include: {
        salesperson: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            dueDate: true
          },
          orderBy: {
            dueDate: 'asc'
          },
          take: 3 // Only include 3 most recent tasks for preview
        },
        _count: {
          select: {
            contactLogs: true,
            tasks: true
          }
        }
      }
    });
    
    // Get total count for pagination
    const totalCount = await prisma.customer.count({ where });
    
    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);
    
    return NextResponse.json({
      data: customers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new customer
export async function POST(request: Request) {
  try {
    // Get authenticated user
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Only ADMIN, PROJECT_MANAGER, and SALES roles can create customers
    if (!['ADMIN', 'PROJECT_MANAGER', 'SALES'].includes(authUser.role)) {
      return NextResponse.json(
        { error: 'Not authorized to create customers' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Customer name is required' },
        { status: 400 }
      );
    }
    
    // Auto-assign the salesperson if role is SALES
    const salespersonId = 
      authUser.role === 'SALES' 
        ? authUser.userId 
        : body.salespersonId || null;
    
    // Create customer in database
    const customer = await prisma.customer.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        industry: body.industry || 'OTHER',
        status: body.status || 'LEAD',
        requirements: body.requirements,
        salespersonId
      }
    });
    
    // Return the created customer
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
} 