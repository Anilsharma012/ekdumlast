import { useState } from "react";
import { Filter, X, MapPin, IndianRupee, Home, Bed, Bath } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Slider } from "./ui/slider";

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FilterPanel({ isOpen, onClose }: FilterPanelProps) {
  const [priceRange, setPriceRange] = useState([0, 10000000]);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>(
    [],
  );

  const propertyTypes = [
    "Residential",
    "Commercial",
    "Plots",
    "Flats",
    "PG / Rental",
    "Builder Floors",
    "Agricultural Land",
    "Shops",
    "Warehouses",
  ];

  const sectors = [
    "Sector 1",
    "Sector 2",
    "Sector 3",
    "Sector 4",
    "Sector 5",
    "Sector 6",
    "Sector 7",
    "Sector 8",
    "Sector 9",
    "Sector 10",
    "Sector 11",
    "Sector 12",
    "Sector 13",
    "Sector 14",
    "Sector 15",
    "Sector 16",
    "Sector 17",
    "Sector 18",
    "Sector 19",
    "Sector 20",
  ];

  const handlePropertyTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setSelectedPropertyTypes([...selectedPropertyTypes, type]);
    } else {
      setSelectedPropertyTypes(selectedPropertyTypes.filter((t) => t !== type));
    }
  };

  const formatPrice = (value: number) => {
    if (value >= 10000000) return "₹1Cr+";
    if (value >= 1000000) return `₹${(value / 1000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    return `₹${value.toLocaleString()}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden">
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-[#C70000]" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          <button onClick={onClose} className="p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Location */}
          <div>
            <Label className="text-base font-medium flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-[#C70000]" />
              Location
            </Label>
            <div className="space-y-3">
              <Input placeholder="Enter area, sector, or landmark" />
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select Sector" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((sector) => (
                    <SelectItem
                      key={sector}
                      value={sector.toLowerCase().replace(" ", "-")}
                    >
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price Range */}
          <div>
            <Label className="text-base font-medium flex items-center gap-2 mb-3">
              <IndianRupee className="h-4 w-4 text-[#C70000]" />
              Price Range
            </Label>
            <div className="space-y-4">
              <Slider
                value={priceRange}
                onValueChange={setPriceRange}
                max={10000000}
                step={100000}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{formatPrice(priceRange[0])}</span>
                <span>{formatPrice(priceRange[1])}</span>
              </div>
            </div>
          </div>

          {/* Property Type */}
          <div>
            <Label className="text-base font-medium flex items-center gap-2 mb-3">
              <Home className="h-4 w-4 text-[#C70000]" />
              Property Type
            </Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {propertyTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={type}
                    checked={selectedPropertyTypes.includes(type)}
                    onCheckedChange={(checked) =>
                      handlePropertyTypeChange(type, checked as boolean)
                    }
                  />
                  <Label htmlFor={type} className="text-sm font-normal">
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Bedrooms */}
          <div>
            <Label className="text-base font-medium flex items-center gap-2 mb-3">
              <Bed className="h-4 w-4 text-[#C70000]" />
              Bedrooms
            </Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select BHK" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1bhk">1 BHK</SelectItem>
                <SelectItem value="2bhk">2 BHK</SelectItem>
                <SelectItem value="3bhk">3 BHK</SelectItem>
                <SelectItem value="4bhk">4 BHK</SelectItem>
                <SelectItem value="5plus">5+ BHK</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bathrooms */}
          <div>
            <Label className="text-base font-medium flex items-center gap-2 mb-3">
              <Bath className="h-4 w-4 text-[#C70000]" />
              Bathrooms
            </Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select bathrooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Bathroom</SelectItem>
                <SelectItem value="2">2 Bathrooms</SelectItem>
                <SelectItem value="3">3 Bathrooms</SelectItem>
                <SelectItem value="4plus">4+ Bathrooms</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div>
            <Label className="text-base font-medium mb-3 block">Sort By</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Sort properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price-low-high">
                  Price: Low to High
                </SelectItem>
                <SelectItem value="price-high-low">
                  Price: High to Low
                </SelectItem>
                <SelectItem value="area-large-small">
                  Area: Large to Small
                </SelectItem>
                <SelectItem value="area-small-large">
                  Area: Small to Large
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="sticky bottom-0 bg-white border-t p-4 space-y-3">
          <Button
            className="w-full bg-[#C70000] hover:bg-[#A60000] text-white"
            size="lg"
          >
            Apply Filters
          </Button>
          <Button
            variant="outline"
            className="w-full border-gray-300"
            size="lg"
          >
            Clear All
          </Button>
        </div>
      </div>
    </div>
  );
}
