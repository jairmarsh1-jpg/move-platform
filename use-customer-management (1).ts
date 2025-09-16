/**
 * Customer Management Hooks for Moving Platform SaaS
 *
 * Provides comprehensive React hooks for customer registration, authentication,
 * profile updates, and move history access.
 * Uses TanStack Query for optimal caching and state management.
 */

import type { Filter, Page, Sort } from "@/components/data/orm/common";
import {
	type CustomerModel,
	CustomerORM,
} from "@/components/data/orm/orm_customer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Input interfaces for various operations
export interface CreateCustomerInput {
	first_name: string;
	last_name: string;
	email: string;
	phone_number: string;
	address?: string;
	preferences?: string;
}

export interface UpdateCustomerInput {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
	phone_number: string;
	address?: string;
	preferences?: string;
	// Preserve existing data fields
	data_creator: string;
	create_time: string;
}

export interface CustomerListFilters {
	filter?: Filter;
	sort?: Sort;
	paginate?: Page;
}

export interface CustomerProfileUpdate {
	customerId: string;
	first_name?: string;
	last_name?: string;
	phone_number?: string;
	address?: string;
}

export interface CustomerPreferencesUpdate {
	customerId: string;
	preferences: string;
}

// Query Keys for consistent caching
const QUERY_KEYS = {
	customers: ["customers"] as const,
	customer: (id: string) => ["customers", id] as const,
	customerByEmail: (email: string) => ["customers", "email", email] as const,
	customerByPhone: (phone: string) => ["customers", "phone", phone] as const,
	customersList: (filters: CustomerListFilters) =>
		["customers", "list", filters] as const,
} as const;

/**
 * Hook to fetch all customers
 */
export function useAllCustomers() {
	const customerORM = CustomerORM.getInstance();

	return useQuery({
		queryKey: QUERY_KEYS.customers,
		queryFn: async (): Promise<CustomerModel[]> => {
			return customerORM.getAllCustomer();
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}

/**
 * Hook to fetch customers with filters, sorting, and pagination
 */
export function useCustomersList(filters: CustomerListFilters = {}) {
	const customerORM = CustomerORM.getInstance();

	return useQuery({
		queryKey: QUERY_KEYS.customersList(filters),
		queryFn: async (): Promise<[CustomerModel[], Page]> => {
			return customerORM.listCustomer(
				filters.filter,
				filters.sort,
				filters.paginate,
			);
		},
		staleTime: 5 * 60 * 1000,
	});
}

/**
 * Hook to fetch a customer by ID
 */
export function useCustomerById(id: string) {
	const customerORM = CustomerORM.getInstance();

	return useQuery({
		queryKey: QUERY_KEYS.customer(id),
		queryFn: async (): Promise<CustomerModel | null> => {
			if (!id) return null;
			const customers = await customerORM.getCustomerById(id);
			return customers[0] || null;
		},
		enabled: !!id,
		staleTime: 5 * 60 * 1000,
	});
}

/**
 * Hook to fetch a customer by email (useful for authentication)
 */
export function useCustomerByEmail(email: string) {
	const customerORM = CustomerORM.getInstance();

	return useQuery({
		queryKey: QUERY_KEYS.customerByEmail(email),
		queryFn: async (): Promise<CustomerModel | null> => {
			if (!email) return null;
			const customers = await customerORM.getCustomerByEmail(email);
			return customers[0] || null;
		},
		enabled: !!email,
		staleTime: 5 * 60 * 1000,
	});
}

/**
 * Hook to fetch a customer by phone number
 */
export function useCustomerByPhone(phone: string) {
	const customerORM = CustomerORM.getInstance();

	return useQuery({
		queryKey: QUERY_KEYS.customerByPhone(phone),
		queryFn: async (): Promise<CustomerModel | null> => {
			if (!phone) return null;
			const customers = await customerORM.getCustomerByPhoneNumber(phone);
			return customers[0] || null;
		},
		enabled: !!phone,
		staleTime: 5 * 60 * 1000,
	});
}

/**
 * Hook to register a new customer
 */
export function useRegisterCustomer() {
	const queryClient = useQueryClient();
	const customerORM = CustomerORM.getInstance();

	return useMutation<CustomerModel[], Error, CreateCustomerInput>({
		mutationFn: async (
			input: CreateCustomerInput,
		): Promise<CustomerModel[]> => {
			// Validate required fields
			if (!input.first_name?.trim()) {
				throw new Error("First name is required");
			}
			if (!input.last_name?.trim()) {
				throw new Error("Last name is required");
			}
			if (!input.email?.trim()) {
				throw new Error("Email is required");
			}
			if (!input.phone_number?.trim()) {
				throw new Error("Phone number is required");
			}

			// Validate email format
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(input.email)) {
				throw new Error("Invalid email format");
			}

			// Validate phone format (basic validation)
			const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
			if (!phoneRegex.test(input.phone_number.replace(/\s/g, ""))) {
				throw new Error("Invalid phone number format");
			}

			// Check if customer already exists by email
			try {
				const existingCustomers = await customerORM.getCustomerByEmail(
					input.email,
				);
				if (existingCustomers.length > 0) {
					throw new Error("Customer with this email already exists");
				}
			} catch (error) {
				// If error is not about existing customer, rethrow
				if (
					error instanceof Error &&
					!error.message.includes("Customer with this email")
				) {
					// Continue if it's just that no customer was found
				} else {
					throw error;
				}
			}

			// Create customer data (backend fills in id, data_creator, etc.)
			const customerData: Partial<CustomerModel> = {
				first_name: input.first_name.trim(),
				last_name: input.last_name.trim(),
				email: input.email.trim().toLowerCase(),
				phone_number: input.phone_number.trim(),
				address: input.address?.trim() || null,
				preferences: input.preferences?.trim() || null,
			};

			return customerORM.insertCustomer([customerData as CustomerModel]);
		},
		onSuccess: () => {
			// Invalidate and refetch customers queries
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers });
			queryClient.invalidateQueries({ queryKey: ["customers", "list"] });
		},
	});
}

/**
 * Hook to update customer profile
 */
export function useUpdateCustomer() {
	const queryClient = useQueryClient();
	const customerORM = CustomerORM.getInstance();

	return useMutation<CustomerModel[], Error, UpdateCustomerInput>({
		mutationFn: async (
			input: UpdateCustomerInput,
		): Promise<CustomerModel[]> => {
			// Validate required fields
			if (!input.id?.trim()) {
				throw new Error("Customer ID is required");
			}
			if (!input.first_name?.trim()) {
				throw new Error("First name is required");
			}
			if (!input.last_name?.trim()) {
				throw new Error("Last name is required");
			}
			if (!input.email?.trim()) {
				throw new Error("Email is required");
			}

			// Validate email format
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(input.email)) {
				throw new Error("Invalid email format");
			}

			const customerData: CustomerModel = {
				id: input.id,
				first_name: input.first_name.trim(),
				last_name: input.last_name.trim(),
				email: input.email.trim().toLowerCase(),
				phone_number: input.phone_number.trim(),
				address: input.address?.trim() || null,
				preferences: input.preferences?.trim() || null,
				data_creator: input.data_creator,
				data_updater: "", // Backend will fill this
				create_time: input.create_time,
				update_time: "", // Backend will fill this
			};

			return customerORM.setCustomerById(input.id, customerData);
		},
		onSuccess: (_, variables) => {
			// Invalidate related queries
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers });
			queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.customer(variables.id),
			});
			queryClient.invalidateQueries({ queryKey: ["customers", "list"] });
		},
	});
}

/**
 * Hook to update customer profile information
 */
export function useUpdateCustomerProfile() {
	const queryClient = useQueryClient();
	const customerORM = CustomerORM.getInstance();

	return useMutation<CustomerModel[], Error, CustomerProfileUpdate>({
		mutationFn: async (
			input: CustomerProfileUpdate,
		): Promise<CustomerModel[]> => {
			if (!input.customerId?.trim()) {
				throw new Error("Customer ID is required");
			}

			// Get existing customer data first
			const existingCustomers = await customerORM.getCustomerById(
				input.customerId,
			);
			if (!existingCustomers.length) {
				throw new Error("Customer not found");
			}

			const existingCustomer = existingCustomers[0];
			const updatedCustomer: CustomerModel = {
				...existingCustomer,
				first_name: input.first_name?.trim() || existingCustomer.first_name,
				last_name: input.last_name?.trim() || existingCustomer.last_name,
				phone_number:
					input.phone_number?.trim() || existingCustomer.phone_number,
				address: input.address?.trim() || existingCustomer.address,
			};

			// Validate phone if provided
			if (input.phone_number) {
				const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
				if (!phoneRegex.test(input.phone_number.replace(/\s/g, ""))) {
					throw new Error("Invalid phone number format");
				}
			}

			return customerORM.setCustomerById(input.customerId, updatedCustomer);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.customer(variables.customerId),
			});
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers });
		},
	});
}

/**
 * Hook to update customer preferences
 */
export function useUpdateCustomerPreferences() {
	const queryClient = useQueryClient();
	const customerORM = CustomerORM.getInstance();

	return useMutation<CustomerModel[], Error, CustomerPreferencesUpdate>({
		mutationFn: async (
			input: CustomerPreferencesUpdate,
		): Promise<CustomerModel[]> => {
			if (!input.customerId?.trim()) {
				throw new Error("Customer ID is required");
			}
			if (!input.preferences?.trim()) {
				throw new Error("Preferences are required");
			}

			// Get existing customer data first
			const existingCustomers = await customerORM.getCustomerById(
				input.customerId,
			);
			if (!existingCustomers.length) {
				throw new Error("Customer not found");
			}

			const existingCustomer = existingCustomers[0];
			const updatedCustomer: CustomerModel = {
				...existingCustomer,
				preferences: input.preferences.trim(),
			};

			return customerORM.setCustomerById(input.customerId, updatedCustomer);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.customer(variables.customerId),
			});
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers });
		},
	});
}

/**
 * Hook to delete a customer
 */
export function useDeleteCustomer() {
	const queryClient = useQueryClient();
	const customerORM = CustomerORM.getInstance();

	return useMutation<void, Error, string>({
		mutationFn: async (customerId: string): Promise<void> => {
			if (!customerId?.trim()) {
				throw new Error("Customer ID is required");
			}

			return customerORM.deleteCustomerById(customerId);
		},
		onSuccess: (_, customerId) => {
			// Invalidate and remove from cache
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers });
			queryClient.removeQueries({ queryKey: QUERY_KEYS.customer(customerId) });
			queryClient.invalidateQueries({ queryKey: ["customers", "list"] });
		},
	});
}

/**
 * Hook to authenticate customer by email (simplified check)
 * In a real app, this would involve password verification
 */
export function useAuthenticateCustomer() {
	const customerORM = CustomerORM.getInstance();

	return useMutation<CustomerModel | null, Error, string>({
		mutationFn: async (email: string): Promise<CustomerModel | null> => {
			if (!email?.trim()) {
				throw new Error("Email is required");
			}

			// Validate email format
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				throw new Error("Invalid email format");
			}

			const customers = await customerORM.getCustomerByEmail(
				email.trim().toLowerCase(),
			);
			return customers[0] || null;
		},
	});
}
