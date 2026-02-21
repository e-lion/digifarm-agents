"use client";

import { useForm, Controller } from "react-hook-form";
import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createBuyer,
  getBuyerTypes,
  getValueChains,
  getContactDesignations,
} from "@/lib/actions/buyers";
import { getCurrentProfile } from "@/lib/actions/users";
import { kenyaCounties } from "@/lib/constants/counties";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PhoneInput, isValidPhoneNumber } from "@/components/ui/PhoneInput";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { User, MapPin, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

// Dynamically import map picker to avoid SSR issues
const BuyerLocationPicker = dynamic(() => import("./BuyerLocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400">
      Loading Map...
    </div>
  ),
});

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  business_type: z.string().min(1, "Business Type is required"),
  county: z.string().min(1, "County is required"),
  value_chain: z.array(z.string()).min(1, "Select at least one value chain"),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  contact_name: z.string().optional(),
  phone: z
    .string()
    .refine((val) => !val || isValidPhoneNumber(val), {
      message: "Invalid phone number",
    })
    .optional(),
  contact_designation: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function BuyerForm() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: buyerTypes = [] } = useQuery({
    queryKey: ["buyerTypes"],
    queryFn: getBuyerTypes,
  });
  const { data: valueChains = [] } = useQuery({
    queryKey: ["valueChains"],
    queryFn: getValueChains,
  });
  const { data: designations = [] } = useQuery({
    queryKey: ["contactDesignations"],
    queryFn: getContactDesignations,
  });
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: getCurrentProfile,
  });

  const availableCounties = useMemo(() => {
    if (profile?.role === "admin" || !profile?.counties || profile.counties.length === 0) {
      return kenyaCounties;
    }
    return kenyaCounties.filter(c => profile.counties.includes(c));
  }, [profile]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      business_type: "",
      county: "",
      value_chain: [],
      contact_name: "",
      phone: "",
      contact_designation: "",
    },
  });

  const mutation = useMutation({
    mutationFn: createBuyer,
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Buyer created successfully");
        queryClient.invalidateQueries({ queryKey: ["buyers"] });
        router.push("/agent/buyers");
      } else {
        toast.error(result.error || "Failed to create buyer");
      }
    },
    onError: (error) => {
      toast.error("Failed to create buyer");
      console.error(error);
    },
  });

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 max-w-2xl mx-auto pb-12"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-green-600" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Buyer Name *
            </label>
            <Input {...register("name")} placeholder="e.g. Mama Mboga Shop" />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Business Type *
            </label>
            <Controller
              name="business_type"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  options={buyerTypes}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select type..."
                />
              )}
            />
            {errors.business_type && (
              <p className="text-xs text-red-500 mt-1">
                {errors.business_type.message}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Value Chains *
            </label>
            <Controller
              name="value_chain"
              control={control}
              render={({ field }) => (
                <MultiSelect
                  options={valueChains}
                  selected={field.value}
                  onChange={field.onChange}
                  placeholder="Select option..."
                  closeOnSelect={true}
                />
              )}
            />
            {errors.value_chain && (
              <p className="text-xs text-red-500 mt-1">
                {errors.value_chain.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-600" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Pin Location on Map
            </label>
            <Controller
              name="location"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <BuyerLocationPicker
                    value={field.value}
                    onChange={field.onChange}
                  />
                  {errors.location && (
                    <p className="text-xs text-red-500">
                      {errors.location.message}
                    </p>
                  )}
                </div>
              )}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              County *
            </label>
            <Controller
              name="county"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  options={availableCounties}
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder="Select county..."
                />
              )}
            />
            {errors.county && (
              <p className="text-xs text-red-500 mt-1">
                {errors.county.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-green-600" />
            Primary Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Contact Name
              </label>
              <Input
                {...register("contact_name")}
                placeholder="e.g. John Doe"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <PhoneInput
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Enter phone number"
                    error={errors.phone?.message}
                  />
                )}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">
                Designation
              </label>
              <Controller
                name="contact_designation"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    options={designations}
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Select designation..."
                  />
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="pt-4 flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-1" isLoading={mutation.isPending}>
          Create Buyer
        </Button>
      </div>
    </form>
  );
}
