import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CustomerDetailView } from '@/components/customers/CustomerDetailView';
import { Customer, Task, ContactRecord, User, CustomerStatus, CustomerIndustry, TaskStatus, TaskPriority, ContactMethod } from '@prisma/client';

interface PageProps {
  params: {
    id: string;
  };
}

interface ExtendedUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ExtendedTask extends Omit<Task, 'dueDate'> {
  dueDate: string | null;
  assignee: ExtendedUser | null;
}

interface ExtendedContactRecord extends Omit<ContactRecord, 'date'> {
  date: string;
  user: ExtendedUser;
}

interface CustomerWithRelations extends Omit<Customer, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
  salesperson: ExtendedUser | null;
  tasks: ExtendedTask[];
  contactRecords: ExtendedContactRecord[];
}

async function getCustomer(id: string): Promise<CustomerWithRelations> {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      salesperson: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      tasks: {
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
      contactLogs: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!customer) {
    notFound();
  }

  // Convert dates to strings and transform the data
  const transformedCustomer = {
    ...customer,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    tasks: customer.tasks.map(task => ({
      ...task,
      dueDate: task.dueDate?.toISOString() || null,
      assignee: task.assignee ? {
        id: task.assignee.id,
        name: task.assignee.name,
        email: task.assignee.email,
        role: task.assignee.role,
      } : null,
    })),
    contactRecords: customer.contactLogs.map(record => ({
      ...record,
      date: record.date.toISOString(),
      user: {
        id: record.user.id,
        name: record.user.name,
        email: record.user.email,
        role: record.user.role,
      },
    })),
  };

  return transformedCustomer as CustomerWithRelations;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    notFound();
  }

  const customer = await getCustomer(params.id);

  // Check if user has access to this customer
  const userRole = (session.user as any).role as string;
  const userId = (session.user as any).id as string;
  
  if (userRole !== 'ADMIN' && customer.salespersonId !== userId) {
    notFound();
  }

  return <CustomerDetailView customer={customer} />;
} 