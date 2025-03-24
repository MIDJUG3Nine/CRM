import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

// GET endpoint to fetch contact records for a customer
export async function GET(
  request: Request,
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
    
    const customerId = params.id;
    
    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { 
        id: true, 
        salespersonId: true,
        tasks: {
          select: {
            assigneeId: true
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
    // SALES can only view contacts for their own customers
    if (authUser.role === 'SALES' && customer.salespersonId !== authUser.userId) {
      return NextResponse.json(
        { error: 'Not authorized to view contacts for this customer' },
        { status: 403 }
      );
    }
    
    // DESIGNER can only view contacts for customers they have tasks for
    if (authUser.role === 'DESIGNER') {
      const hasAssignedTask = customer.tasks.some(
        (task: { assigneeId: string | null }) => task.assigneeId === authUser.userId
      );
      
      if (!hasAssignedTask) {
        return NextResponse.json(
          { error: 'Not authorized to view contacts for this customer' },
          { status: 403 }
        );
      }
    }
    
    // Parse URL and get search parameters
    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Filter parameters
    const method = searchParams.get('method') || undefined;
    const userId = searchParams.get('userId') || undefined;
    
    // Build where clause
    const where: any = { customerId };
    
    if (method) {
      where.method = method;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    // Fetch contact records with pagination
    const contactRecords = await prisma.contactRecord.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        date: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });
    
    // Get total count for pagination
    const totalCount = await prisma.contactRecord.count({ where });
    
    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);
    
    return NextResponse.json({
      data: contactRecords,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching contact records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact records' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new contact record
export async function POST(
  request: Request,
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
    
    const customerId = params.id;
    
    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { 
        id: true, 
        salespersonId: true 
      }
    });
    
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }
    
    // For SALES, they can only add contact records for their own customers
    if (authUser.role === 'SALES' && customer.salespersonId !== authUser.userId) {
      return NextResponse.json(
        { error: 'Not authorized to add contact records for this customer' },
        { status: 403 }
      );
    }
    
    // For DESIGNER, they can't add contact records
    if (authUser.role === 'DESIGNER') {
      return NextResponse.json(
        { error: 'Not authorized to add contact records' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.method || !body.content) {
      return NextResponse.json(
        { error: 'Method and content are required' },
        { status: 400 }
      );
    }
    
    // Create a new contact record
    const contactRecord = await prisma.contactRecord.create({
      data: {
        method: body.method,
        content: body.content,
        feedback: body.feedback || null,
        followUpPlan: body.followUpPlan || null,
        date: body.date ? new Date(body.date) : new Date(),
        customerId,
        userId: authUser.userId
      }
    });
    
    return NextResponse.json(contactRecord, { status: 201 });
  } catch (error) {
    console.error('Error creating contact record:', error);
    return NextResponse.json(
      { error: 'Failed to create contact record' },
      { status: 500 }
    );
  }
} 