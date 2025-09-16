/**
 * Company Management Hooks for Moving Platform SaaS
 *
 * Provides comprehensive React hooks for company registration, profile management,
 * service area updates, fleet management, and pricing configuration.
 * Uses TanStack Query for optimal caching and state management.
 */

import type { Filter, Page, Sort } from "@/components/data/orm/common";
import {
	type CompanyModel,
	CompanyORM,
} from "@/components/data/orm/orm_company";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Input interfaces for various operations
export interface CreateCompanyInput {
	name: string;
	description?: string;
	contact_email: string;
	contact_phone: string;
	website?: string;
	address: string;
	service_area?: string;
	fleet_detail?: string;
	pricing_tier?: string;
}

export interface UpdateCompanyInput {
	id: string;
	name: string;
	description?: string;
	contact_email: string;
	contact_phone: string;
	website?: string;
	address: string;
	service_area?: string;
	fleet_detail?: string;
	pricing_tier?: string;
	// Preserve existing data fields
	data_creator: string;
	create_time: string;
}

export interface CompanyListFilters {
	filter?: Filter;
	sort?: Sort;
	paginate?: Page;
}

export interface ServiceAreaUpdate {
	companyId: string;
	serviceArea: string;
}

export interface FleetUpdate {
	companyId: string;
	fleetDetail: string;
}

export interface PricingUpdate {
	companyId: string;
	pricingTier: string;
}

// Query Keys for consistent caching
const QUERY_KEYS = {
	companies: ["companies"] as const,
	company: (id: string) => ["companies", id] as const,
	companyByEmail: (email: string) => ["companies", "email", email] as const,
	companyByName: (name: string) => ["companies", "name", name] as const,
	companiesList: (filters: CompanyListFilters) =>
		["companies", "list", filters] as const,
} as const;

/**
 * Hook to fetch all companies
 */
export function useAllCompanies() {
	const companyORM = CompanyORM.getInstance();

	return useQuery({
		queryKey: QUERY_KEYS.companies,
		queryFn: async (): Promise<CompanyModel[]> => {
			return companyORM.getAllCompany();
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}

/**
 * Hook to fetch companies with filters, sorting, and pagination
 */
export function useCompaniesList(filters: CompanyListFilters = {}) {
	const companyORM = CompanyORM.getInstance();

	return useQuery({
		queryKey: QUERY_KEYS.companiesList(filters),
		queryFn: async (): Promise<[CompanyModel[], Page]> => {
			return companyORM.listCompany(
				filters.filter,
				filters.sort,
				filters.paginate,
			);
		},
		staleTime: 5 * 60 * 1000,
	});
}

/**
 * Hook to fetch a company by ID
 */
export function useCompanyById(id: string) {
	const companyORM = CompanyORM.getInstance();

	return useQuery({
		queryKey: QUERY_KEYS.company(id),
		queryFn: async (): Promise<CompanyModel | null> => {
			if (!id) return null;
			const companies = await companyORM.getCompanyById(id);
			return companies[0] || null;
		},
		enabled: !!id,
		staleTime: 5 * 60 * 1000,
	});
}

/**
 * Hook to fetch a company by email
 */
export function useCompanyByEmail(email: string) {
	const companyORM = CompanyORM.getInstance();

	return useQuery({
		queryKey: QUERY_KEYS.companyByEmail(email),
		queryFn: async (): Promise<CompanyModel | null> => {
			if (!email) return null;
			const companies = await companyORM.getCompanyByContactEmail(email);
			return companies[0] || null;
		},
		enabled: !!email,
		staleTime: 5 * 60 * 1000,
	});
}

/**
 * Hook to fetch a company by name
 */
export function useCompanyByName(name: string) {
	const companyORM = CompanyORM.getInstance();

	return useQuery({
		queryKey: QUERY_KEYS.companyByName(name),
		queryFn: async (): Promise<CompanyModel | null> => {
			if (!name) return null;
			const companies = await companyORM.getCompanyByName(name);
			return companies[0] || null;
		},
		enabled: !!name,
		staleTime: 5 * 60 * 1000,
	});
}

/**
 * Hook to create a new company
 */
export function useCreateCompany() {
	const queryClient = useQueryClient();
	const companyORM = CompanyORM.getInstance();

	return useMutation<CompanyModel[], Error, CreateCompanyInput>({
		mutationFn: async (input: CreateCompanyInput): Promise<CompanyModel[]> => {
			// Validate required fields
			if (!input.name?.trim()) {
				throw new Error("Company name is required");
			}
			if (!input.contact_email?.trim()) {
				throw new Error("Contact email is required");
			}
			if (!input.contact_phone?.trim()) {
				throw new Error("Contact phone is required");
			}
			if (!input.address?.trim()) {
				throw new Error("Company address is required");
			}

			// Validate email format
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(input.contact_email)) {
				throw new Error("Invalid email format");
			}

			// Create company data (backend fills in id, data_creator, etc.)
			const companyData: Partial<CompanyModel> = {
				name: input.name.trim(),
				description: input.description?.trim() || null,
				contact_email: input.contact_email.trim(),
				contact_phone: input.contact_phone.trim(),
				website: input.website?.trim() || null,
				address: input.address.trim(),
				service_area: input.service_area?.trim() || null,
				fleet_detail: input.fleet_detail?.trim() || null,
				pricing_tier: input.pricing_tier?.trim() || null,
			};

			return companyORM.insertCompany([companyData as CompanyModel]);
		},
		onSuccess: () => {
			// Invalidate and refetch companies queries
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
			queryClient.invalidateQueries({ queryKey: ["companies", "list"] });
		},
	});
}

/**
 * Hook to update an existing company
 */
export function useUpdateCompany() {
	const queryClient = useQueryClient();
	const companyORM = CompanyORM.getInstance();

	return useMutation<CompanyModel[], Error, UpdateCompanyInput>({
		mutationFn: async (input: UpdateCompanyInput): Promise<CompanyModel[]> => {
			// Validate required fields
			if (!input.id?.trim()) {
				throw new Error("Company ID is required");
			}
			if (!input.name?.trim()) {
				throw new Error("Company name is required");
			}
			if (!input.contact_email?.trim()) {
				throw new Error("Contact email is required");
			}

			// Validate email format
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(input.contact_email)) {
				throw new Error("Invalid email format");
			}

			const companyData: CompanyModel = {
				id: input.id,
				name: input.name.trim(),
				description: input.description?.trim() || null,
				contact_email: input.contact_email.trim(),
				contact_phone: input.contact_phone.trim(),
				website: input.website?.trim() || null,
				address: input.address.trim(),
				service_area: input.service_area?.trim() || null,
				fleet_detail: input.fleet_detail?.trim() || null,
				pricing_tier: input.pricing_tier?.trim() || null,
				data_creator: input.data_creator,
				data_updater: "", // Backend will fill this
				create_time: input.create_time,
				update_time: "", // Backend will fill this
			};

			return companyORM.setCompanyById(input.id, companyData);
		},
		onSuccess: (_, variables) => {
			// Invalidate related queries
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
			queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.company(variables.id),
			});
			queryClient.invalidateQueries({ queryKey: ["companies", "list"] });
		},
	});
}

/**
 * Hook to update company service area
 */
export function useUpdateServiceArea() {
	const queryClient = useQueryClient();
	const companyORM = CompanyORM.getInstance();

	return useMutation<CompanyModel[], Error, ServiceAreaUpdate>({
		mutationFn: async (input: ServiceAreaUpdate): Promise<CompanyModel[]> => {
			if (!input.companyId?.trim()) {
				throw new Error("Company ID is required");
			}
			if (!input.serviceArea?.trim()) {
				throw new Error("Service area is required");
			}

			// Get existing company data first
			const existingCompanies = await companyORM.getCompanyById(
				input.companyId,
			);
			if (!existingCompanies.length) {
				throw new Error("Company not found");
			}

			const existingCompany = existingCompanies[0];
			const updatedCompany: CompanyModel = {
				...existingCompany,
				service_area: input.serviceArea.trim(),
			};

			return companyORM.setCompanyById(input.companyId, updatedCompany);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.company(variables.companyId),
			});
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
		},
	});
}

/**
 * Hook to update company fleet details
 */
export function useUpdateFleetDetails() {
	const queryClient = useQueryClient();
	const companyORM = CompanyORM.getInstance();

	return useMutation<CompanyModel[], Error, FleetUpdate>({
		mutationFn: async (input: FleetUpdate): Promise<CompanyModel[]> => {
			if (!input.companyId?.trim()) {
				throw new Error("Company ID is required");
			}
			if (!input.fleetDetail?.trim()) {
				throw new Error("Fleet details are required");
			}

			// Get existing company data first
			const existingCompanies = await companyORM.getCompanyById(
				input.companyId,
			);
			if (!existingCompanies.length) {
				throw new Error("Company not found");
			}

			const existingCompany = existingCompanies[0];
			const updatedCompany: CompanyModel = {
				...existingCompany,
				fleet_detail: input.fleetDetail.trim(),
			};

			return companyORM.setCompanyById(input.companyId, updatedCompany);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.company(variables.companyId),
			});
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
		},
	});
}

/**
 * Hook to update company pricing configuration
 */
export function useUpdatePricingTier() {
	const queryClient = useQueryClient();
	const companyORM = CompanyORM.getInstance();

	return useMutation<CompanyModel[], Error, PricingUpdate>({
		mutationFn: async (input: PricingUpdate): Promise<CompanyModel[]> => {
			if (!input.companyId?.trim()) {
				throw new Error("Company ID is required");
			}
			if (!input.pricingTier?.trim()) {
				throw new Error("Pricing tier is required");
			}

			// Get existing company data first
			const existingCompanies = await companyORM.getCompanyById(
				input.companyId,
			);
			if (!existingCompanies.length) {
				throw new Error("Company not found");
			}

			const existingCompany = existingCompanies[0];
			const updatedCompany: CompanyModel = {
				...existingCompany,
				pricing_tier: input.pricingTier.trim(),
			};

			return companyORM.setCompanyById(input.companyId, updatedCompany);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.company(variables.companyId),
			});
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
		},
	});
}

/**
 * Hook to delete a company
 */
export function useDeleteCompany() {
	const queryClient = useQueryClient();
	const companyORM = CompanyORM.getInstance();

	return useMutation<void, Error, string>({
		mutationFn: async (companyId: string): Promise<void> => {
			if (!companyId?.trim()) {
				throw new Error("Company ID is required");
			}

			return companyORM.deleteCompanyById(companyId);
		},
		onSuccess: (_, companyId) => {
			// Invalidate and remove from cache
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
			queryClient.removeQueries({ queryKey: QUERY_KEYS.company(companyId) });
			queryClient.invalidateQueries({ queryKey: ["companies", "list"] });
		},
	});
}
