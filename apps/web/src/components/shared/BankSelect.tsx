"use client";

import type { Bank } from "@givvly/contracts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type BankSelectProps = {
  banks: readonly Bank[];
  value: string;
  onValueChange: (bankCode: string) => void;
  disabled?: boolean;
  id?: string;
};

export function BankSelect({
  banks,
  value,
  onValueChange,
  disabled,
  id,
}: BankSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} aria-label="Select bank">
        <SelectValue placeholder="Choose your bank" />
      </SelectTrigger>
      <SelectContent>
        {banks.map((bank) => (
          <SelectItem key={bank.code} value={bank.code}>
            {bank.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

