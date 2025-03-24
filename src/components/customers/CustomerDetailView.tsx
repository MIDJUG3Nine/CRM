'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiEdit, FiTrash2, FiArrowLeft, FiPlus, FiPhone, FiMail, FiMapPin, FiBox, FiTag, FiUser, FiEye } from 'react-icons/fi';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  industry: string;
  status: string;
  requirements: string | null;
  salesperson: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  tasks: Task[];
  contactRecords: ContactRecord[];
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  assignee: {
    id: string;
    name: string;
    role: string;
  } | null;
}

interface ContactRecord {
  id: string;
  date: string;
  method: string;
  content: string;
  feedback: string | null;
  followUpPlan: string | null;
  user: {
    id: string;
    name: string;
    role: string;
  };
}

interface CustomerDetailViewProps {
  customer: Customer;
}

export function CustomerDetailView({ customer }: CustomerDetailViewProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();

  // Handle delete customer
  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${customer.name}?`)) {
      try {
        const response = await fetch(`/api/customers/${customer.id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete customer');
        }
        
        router.push('/dashboard/customers');
      } catch (err) {
        console.error('Error deleting customer:', err);
        alert('Failed to delete customer');
      }
    }
  };

  // Render status badge
  const renderStatusBadge = (status: string) => {
    let bgColor = '';
    switch (status) {
      case 'LEAD':
        bgColor = 'bg-yellow-100 text-yellow-800';
        break;
      case 'ACTIVE':
        bgColor = 'bg-green-100 text-green-800';
        break;
      case 'INACTIVE':
        bgColor = 'bg-gray-100 text-gray-800';
        break;
      default:
        bgColor = 'bg-blue-100 text-blue-800';
    }
    
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${bgColor}`}>
        {status.toLowerCase()}
      </span>
    );
  };

  // Render industry badge
  const renderIndustryBadge = (industry: string) => {
    let bgColor = '';
    switch (industry) {
      case 'TECHNOLOGY':
        bgColor = 'bg-purple-100 text-purple-800';
        break;
      case 'MANUFACTURING':
        bgColor = 'bg-blue-100 text-blue-800';
        break;
      case 'HEALTHCARE':
        bgColor = 'bg-green-100 text-green-800';
        break;
      case 'FINANCE':
        bgColor = 'bg-yellow-100 text-yellow-800';
        break;
      case 'FOOD':
        bgColor = 'bg-red-100 text-red-800';
        break;
      default:
        bgColor = 'bg-gray-100 text-gray-800';
    }
    
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${bgColor}`}>
        {industry.toLowerCase()}
      </span>
    );
  };

  // Render task status badge
  const renderTaskStatusBadge = (status: string) => {
    let bgColor = '';
    switch (status) {
      case 'PENDING':
        bgColor = 'bg-yellow-100 text-yellow-800';
        break;
      case 'IN_PROGRESS':
        bgColor = 'bg-blue-100 text-blue-800';
        break;
      case 'COMPLETED':
        bgColor = 'bg-green-100 text-green-800';
        break;
      case 'CANCELLED':
        bgColor = 'bg-red-100 text-red-800';
        break;
      default:
        bgColor = 'bg-gray-100 text-gray-800';
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${bgColor}`}>
        {status.replace('_', ' ').toLowerCase()}
      </span>
    );
  };

  // Render contact method badge
  const renderContactMethodBadge = (method: string) => {
    let bgColor = '';
    let icon = null;
    
    switch (method) {
      case 'EMAIL':
        bgColor = 'bg-blue-100 text-blue-800';
        icon = <FiMail className="mr-1" />;
        break;
      case 'PHONE':
        bgColor = 'bg-green-100 text-green-800';
        icon = <FiPhone className="mr-1" />;
        break;
      case 'MEETING':
        bgColor = 'bg-purple-100 text-purple-800';
        icon = <FiUser className="mr-1" />;
        break;
      case 'VIDEO_CALL':
        bgColor = 'bg-yellow-100 text-yellow-800';
        icon = <FiUser className="mr-1" />;
        break;
      default:
        bgColor = 'bg-gray-100 text-gray-800';
        icon = null;
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center ${bgColor}`}>
        {icon}
        {method.replace('_', ' ').toLowerCase()}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      {/* Top navigation and actions */}
      <div className="mb-6">
        <div className="flex flex-wrap justify-between items-center">
          <div className="flex items-center mb-4 sm:mb-0">
            <Link
              href="/dashboard/customers"
              className="text-blue-600 hover:text-blue-900 mr-4 flex items-center"
            >
              <FiArrowLeft className="mr-2" /> Back
            </Link>
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            <div className="ml-4 flex space-x-2">
              {renderStatusBadge(customer.status)}
              {renderIndustryBadge(customer.industry)}
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Link
              href={`/dashboard/customers/${customer.id}/edit`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <FiEdit className="mr-2" /> Edit
            </Link>
            <button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <FiTrash2 className="mr-2" /> Delete
            </button>
          </div>
        </div>
      </div>
      
      {/* Tab navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 font-medium text-sm ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-4 font-medium text-sm ${
              activeTab === 'tasks'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Tasks ({customer.tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`pb-4 font-medium text-sm ${
              activeTab === 'contacts'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Interaction History ({customer.contactRecords.length})
          </button>
        </nav>
      </div>
      
      {/* Content area */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic information */}
              <div>
                <h2 className="text-lg font-medium mb-4">Customer Information</h2>
                <div className="space-y-4">
                  {customer.email && (
                    <div className="flex items-start">
                      <FiMail className="mt-0.5 mr-2 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Email</div>
                        <a href={`mailto:${customer.email}`} className="text-blue-600 hover:text-blue-800">
                          {customer.email}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {customer.phone && (
                    <div className="flex items-start">
                      <FiPhone className="mt-0.5 mr-2 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Phone</div>
                        <a href={`tel:${customer.phone}`} className="text-blue-600 hover:text-blue-800">
                          {customer.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {customer.address && (
                    <div className="flex items-start">
                      <FiMapPin className="mt-0.5 mr-2 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Address</div>
                        <div>{customer.address}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start">
                    <FiBox className="mt-0.5 mr-2 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Industry</div>
                      <div>{customer.industry.toLowerCase()}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <FiTag className="mt-0.5 mr-2 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Status</div>
                      <div>{customer.status.toLowerCase()}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Additional information */}
              <div>
                <h2 className="text-lg font-medium mb-4">Additional Information</h2>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <FiUser className="mt-0.5 mr-2 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Assigned Salesperson</div>
                      {customer.salesperson ? (
                        <div>
                          <div>{customer.salesperson.name}</div>
                          <a href={`mailto:${customer.salesperson.email}`} className="text-blue-600 hover:text-blue-800 text-sm">
                            {customer.salesperson.email}
                          </a>
                        </div>
                      ) : (
                        <div className="text-gray-500">Unassigned</div>
                      )}
                    </div>
                  </div>
                  
                  {customer.requirements && (
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Requirements</div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="whitespace-pre-wrap">{customer.requirements}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Recent activity */}
            <div className="mt-8">
              <h2 className="text-lg font-medium mb-4">Recent Activity</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent tasks */}
                <div>
                  <h3 className="text-md font-medium mb-2">Recent Tasks</h3>
                  {customer.tasks.length > 0 ? (
                    <ul className="space-y-2">
                      {customer.tasks.slice(0, 3).map((task) => (
                        <li key={task.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between">
                            <div className="font-medium">{task.title}</div>
                            {renderTaskStatusBadge(task.status)}
                          </div>
                          {task.dueDate && (
                            <div className="text-sm text-gray-500">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-gray-500">No tasks yet</div>
                  )}
                  
                  {customer.tasks.length > 3 && (
                    <button
                      onClick={() => setActiveTab('tasks')}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      View all {customer.tasks.length} tasks
                    </button>
                  )}
                </div>
                
                {/* Recent interactions */}
                <div>
                  <h3 className="text-md font-medium mb-2">Recent Interactions</h3>
                  {customer.contactRecords.length > 0 ? (
                    <ul className="space-y-2">
                      {customer.contactRecords.slice(0, 3).map((contact) => (
                        <li key={contact.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between">
                            <div className="flex items-center">
                              {renderContactMethodBadge(contact.method)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(contact.date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="mt-1">{contact.content}</div>
                          <div className="text-sm text-gray-500">
                            By: {contact.user.name}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-gray-500">No interaction records yet</div>
                  )}
                  
                  {customer.contactRecords.length > 3 && (
                    <button
                      onClick={() => setActiveTab('contacts')}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      View all {customer.contactRecords.length} interactions
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Tasks tab */}
        {activeTab === 'tasks' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Tasks</h2>
              <Link
                href={`/dashboard/tasks/new?customerId=${customer.id}`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
              >
                <FiPlus className="mr-2" /> Add Task
              </Link>
            </div>
            
            {customer.tasks.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500">No tasks assigned to this customer yet.</p>
                <Link
                  href={`/dashboard/tasks/new?customerId=${customer.id}`}
                  className="mt-4 inline-block text-blue-600 hover:text-blue-800"
                >
                  Create a new task
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Task
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assignee
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customer.tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {task.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderTaskStatusBadge(task.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {task.dueDate 
                              ? new Date(task.dueDate).toLocaleDateString() 
                              : 'No due date'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {task.assignee ? task.assignee.name : 'Unassigned'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <Link
                              href={`/dashboard/tasks/${task.id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <FiEye className="w-5 h-5" />
                            </Link>
                            <Link
                              href={`/dashboard/tasks/${task.id}/edit`}
                              className="text-green-600 hover:text-green-900"
                            >
                              <FiEdit className="w-5 h-5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {/* Contact records tab */}
        {activeTab === 'contacts' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Interaction History</h2>
              <Link
                href={`/dashboard/customers/${customer.id}/add-contact`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
              >
                <FiPlus className="mr-2" /> Add Interaction
              </Link>
            </div>
            
            {customer.contactRecords.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500">No interaction records for this customer yet.</p>
                <Link
                  href={`/dashboard/customers/${customer.id}/add-contact`}
                  className="mt-4 inline-block text-blue-600 hover:text-blue-800"
                >
                  Record a new interaction
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {customer.contactRecords
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((contact) => (
                    <div key={contact.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex flex-wrap justify-between items-start mb-2">
                        <div className="flex items-center mb-2 sm:mb-0">
                          {renderContactMethodBadge(contact.method)}
                          <span className="ml-2 text-sm text-gray-500">
                            {formatDate(contact.date)}
                          </span>
                        </div>
                        <div className="text-sm flex items-center">
                          <FiUser className="mr-1" />
                          {contact.user.name}
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <div className="font-medium">Content:</div>
                        <div className="text-gray-700 whitespace-pre-wrap">{contact.content}</div>
                      </div>
                      
                      {contact.feedback && (
                        <div className="mt-2">
                          <div className="font-medium">Feedback:</div>
                          <div className="text-gray-700 whitespace-pre-wrap">{contact.feedback}</div>
                        </div>
                      )}
                      
                      {contact.followUpPlan && (
                        <div className="mt-2">
                          <div className="font-medium">Follow-up Plan:</div>
                          <div className="text-gray-700 whitespace-pre-wrap">{contact.followUpPlan}</div>
                        </div>
                      )}
                      
                      <div className="mt-3 flex justify-end space-x-2">
                        <Link
                          href={`/dashboard/contacts/${contact.id}/edit`}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 