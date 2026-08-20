import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { useEffect } from "react";

type Property = {
  id: number;
  name: string;
  municipality: string | null;
  state: string | null;
};

type PropertySelectorProps = {
  properties: Property[] | undefined;
  value: number | undefined;
  onChange: (propertyId: number | undefined) => void;
  disabled?: boolean;
};

export function PropertySelector({
  properties,
  value,
  onChange,
  disabled = false,
}: PropertySelectorProps) {
  useEffect(() => {
    if (!value && properties?.[0]) onChange(properties[0].id);
    if (value && properties && !properties.some(property => property.id === value)) {
      onChange(properties[0]?.id);
    }
  }, [onChange, properties, value]);

  return (
    <Select
      value={value ? String(value) : undefined}
      onValueChange={nextValue => onChange(Number(nextValue))}
      disabled={disabled || !properties?.length}
    >
      <SelectTrigger className="h-11 min-w-[220px] border-white/10 bg-white/[0.055] text-left text-slate-100 shadow-none backdrop-blur-xl hover:bg-white/[0.08] focus:ring-cyan-300/50">
        <MapPin className="mr-2 h-4 w-4 shrink-0 text-cyan-300" />
        <SelectValue placeholder="Selecione uma propriedade" />
      </SelectTrigger>
      <SelectContent className="border-white/10 bg-[#0b2024] text-slate-100 backdrop-blur-xl">
        {properties?.map(property => (
          <SelectItem
            key={property.id}
            value={String(property.id)}
            className="focus:bg-white/10 focus:text-white"
          >
            <span>{property.name}</span>
            {property.municipality ? (
              <span className="ml-2 text-xs text-slate-400">
                {property.municipality}{property.state ? `, ${property.state}` : ""}
              </span>
            ) : null}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
