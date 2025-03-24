import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define user roles and other enums to match Prisma schema
type UserRole = 'ADMIN' | 'PROJECT_MANAGER' | 'SALES' | 'DESIGNER';
type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';
type CustomerIndustry = 'TECHNOLOGY' | 'MANUFACTURING' | 'HEALTHCARE' | 'FINANCE' | 'FOOD' | 'OTHER';
type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type ContactMethod = 'EMAIL' | 'PHONE' | 'MEETING' | 'VIDEO_CALL';

// Define interface for User to match Prisma schema
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isApproved: boolean;
}

// Define interface for Customer to match Prisma schema
interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  industry: CustomerIndustry;
  status: CustomerStatus;
  salespersonId: string | null;
}

// Helper functions
const randomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const randomItem = <T>(items: T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

// List of statuses for tasks
const taskStatuses: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

// List of contact methods
const contactMethods: ContactMethod[] = ['EMAIL', 'PHONE', 'MEETING', 'VIDEO_CALL'];

async function seedData() {
  try {
    console.log('Starting data seeding...');
    
    // Get users for assignment
    const users = await prisma.user.findMany({
      where: { isApproved: true },
    }) as User[];
    
    if (users.length === 0) {
      console.error('No users found! Run seed:users script first.');
      return;
    }
    
    const adminUser = users.find(u => u.role === 'ADMIN');
    const salesUsers = users.filter(u => u.role === 'SALES');
    const designerUsers = users.filter(u => u.role === 'DESIGNER');
    const projectManagerUsers = users.filter(u => u.role === 'PROJECT_MANAGER');
    
    if (!adminUser || salesUsers.length === 0 || designerUsers.length === 0 || projectManagerUsers.length === 0) {
      console.warn('Not all roles are represented in the database. Some data may not be assigned correctly.');
    }
    
    // Clear existing data (optional - be careful in production!)
    console.log('Clearing existing data...');
    await prisma.contactRecord.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.customer.deleteMany({});
    
    // Create customers
    console.log('Creating customers...');
    const customers: Customer[] = [];
    
    const customerData: { name: string; industry: CustomerIndustry; status: CustomerStatus }[] = [
      { name: 'Acme Corporation', industry: 'TECHNOLOGY', status: 'ACTIVE' },
      { name: 'Globex Industries', industry: 'MANUFACTURING', status: 'ACTIVE' },
      { name: 'Wayne Enterprises', industry: 'HEALTHCARE', status: 'ACTIVE' },
      { name: 'Stark Industries', industry: 'TECHNOLOGY', status: 'ACTIVE' },
      { name: 'Umbrella Corporation', industry: 'HEALTHCARE', status: 'ACTIVE' },
      { name: 'Initech', industry: 'FINANCE', status: 'INACTIVE' },
      { name: 'Massive Dynamic', industry: 'TECHNOLOGY', status: 'ACTIVE' },
      { name: 'Cyberdyne Systems', industry: 'TECHNOLOGY', status: 'ACTIVE' },
      { name: 'Soylent Corp', industry: 'FOOD', status: 'ACTIVE' },
      { name: 'Weyland-Yutani', industry: 'MANUFACTURING', status: 'LEAD' },
      { name: 'Oscorp Industries', industry: 'MANUFACTURING', status: 'LEAD' },
      { name: 'LexCorp', industry: 'TECHNOLOGY', status: 'INACTIVE' },
      { name: 'Gekko & Co', industry: 'FINANCE', status: 'LEAD' },
      { name: 'Tyrell Corporation', industry: 'TECHNOLOGY', status: 'ACTIVE' },
      { name: 'Omni Consumer Products', industry: 'MANUFACTURING', status: 'ACTIVE' },
    ];
    
    for (const data of customerData) {
      const customer = await prisma.customer.create({
        data: {
          name: data.name,
          email: `contact@${data.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
          address: `${Math.floor(Math.random() * 999) + 1} Main St, Suite ${Math.floor(Math.random() * 999) + 1}`,
          industry: data.industry,
          status: data.status,
          salespersonId: salesUsers.length > 0 ? randomItem(salesUsers).id : users[0].id,
        },
      }) as Customer;
      
      customers.push(customer);
      console.log(`Created customer: ${customer.name}`);
    }
    
    // Create tasks
    console.log('Creating tasks...');
    const tasks = [];
    
    const taskTitles = [
      'Initial consultation',
      'Project proposal',
      'Contract signing',
      'Design mockup',
      'Implementation plan',
      'Progress review',
      'Quality assurance',
      'Deliverable handoff',
      'Follow-up meeting',
      'Client feedback session',
      'Payment collection',
      'Project closeout',
      'Maintenance agreement',
      'User training',
      'Documentation review',
    ];
    
    // Create 30 tasks distributed among customers
    for (let i = 0; i < 30; i++) {
      const customer = randomItem(customers);
      const title = randomItem(taskTitles);
      const dueDate = randomDate(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
      const status = randomItem(taskStatuses);
      
      // Assign to appropriate user based on task type
      let assigneeId;
      if (title.includes('consultation') || title.includes('proposal') || title.includes('contract') || title.includes('payment')) {
        assigneeId = salesUsers.length > 0 ? randomItem(salesUsers).id : users[0].id;
      } else if (title.includes('design') || title.includes('mockup') || title.includes('implementation')) {
        assigneeId = designerUsers.length > 0 ? randomItem(designerUsers).id : users[0].id;
      } else {
        assigneeId = projectManagerUsers.length > 0 ? randomItem(projectManagerUsers).id : users[0].id;
      }
      
      // Get creator ID (use admin user or first user as fallback)
      const creatorId = adminUser ? adminUser.id : users[0].id;
      
      const task = await prisma.task.create({
        data: {
          title,
          description: `Task for ${customer.name}: ${title}`,
          dueDate,
          status,
          customerId: customer.id,
          assigneeId,
          creatorId,
        },
      });
      
      tasks.push(task);
      console.log(`Created task: ${task.title} for ${customer.name}`);
    }
    
    // Create contact records
    console.log('Creating contact records...');
    const contacts = [];
    
    // Create 50 contact records distributed among customers
    for (let i = 0; i < 50; i++) {
      const customer = randomItem(customers);
      const method = randomItem(contactMethods);
      const date = randomDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), new Date());
      
      // Assign to appropriate user based on method
      let userId;
      if (method === 'EMAIL' || method === 'PHONE') {
        userId = salesUsers.length > 0 ? randomItem(salesUsers).id : users[0].id;
      } else {
        userId = projectManagerUsers.length > 0 ? randomItem(projectManagerUsers).id : users[0].id;
      }
      
      const contact = await prisma.contactRecord.create({
        data: {
          method,
          date,
          content: `${method} contact with ${customer.name} on ${date.toLocaleDateString()}`,
          customerId: customer.id,
          userId,
        },
      });
      
      contacts.push(contact);
      console.log(`Created contact record: ${method} with ${customer.name}`);
    }
    
    console.log('Data seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedData()
  .then(() => console.log('Done!'))
  .catch(e => console.error(e)); 