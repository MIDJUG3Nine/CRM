import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    console.log('[/api/auth/user] Endpoint called, attempting authentication...');
    
    // Get authenticated user using auth utility
    const nextRequest = request as unknown as NextRequest;
    const authUser = await getAuthenticatedUser(nextRequest);
    
    if (!authUser) {
      console.log('[/api/auth/user] Authentication failed: No user found in token');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    console.log(`[/api/auth/user] User authenticated with ID: ${authUser.userId}, role: ${authUser.role}`);

    // Fetch user data from database
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isApproved: true,
      },
    });

    if (!user) {
      console.log(`[/api/auth/user] User with ID ${authUser.userId} not found in database`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.isApproved) {
      console.log(`[/api/auth/user] User ${user.id} (${user.email}) has not been approved yet`);
      return NextResponse.json(
        { error: 'Your account has not been approved yet' },
        { status: 403 }
      );
    }
    
    console.log(`[/api/auth/user] Successfully retrieved user data for ${user.id} (${user.email})`);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('[/api/auth/user] Error fetching user:', error);
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }
} 