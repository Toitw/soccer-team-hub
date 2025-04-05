import React from "react";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

interface LanguageSelectorProps {
  variant?: "sidebar" | "mobile" | "dropdown";
}

export default function LanguageSelector({ variant = "dropdown" }: LanguageSelectorProps) {
  const { currentLanguage, setLanguage, t } = useLanguage();

  // For standalone buttons in sidebar or mobile navigation
  if (variant === "sidebar") {
    return (
      <div className="px-4 py-2">
        <p className="text-sm mb-2 opacity-70">{t("settings.language")}</p>
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant={currentLanguage === "es" ? "default" : "outline"}
            onClick={() => setLanguage("es")}
            className={`flex-1 ${currentLanguage === "es" ? "" : "bg-white/10 border-white/20 text-white hover:bg-white/20"}`}
          >
            {t("settings.spanish")}
          </Button>
          <Button
            size="sm"
            variant={currentLanguage === "en" ? "default" : "outline"}
            onClick={() => setLanguage("en")}
            className={`flex-1 ${currentLanguage === "en" ? "" : "bg-white/10 border-white/20 text-white hover:bg-white/20"}`}
          >
            {t("settings.english")}
          </Button>
        </div>
      </div>
    );
  }
  
  // For the mobile version
  if (variant === "mobile") {
    return (
      <div className="px-4 py-2">
        <p className="text-sm mb-2 text-center">{t("settings.language")}</p>
        <div className="flex justify-center space-x-2">
          <Button
            size="sm"
            variant={currentLanguage === "es" ? "default" : "outline"}
            onClick={() => setLanguage("es")}
          >
            {t("settings.spanish")}
          </Button>
          <Button
            size="sm"
            variant={currentLanguage === "en" ? "default" : "outline"}
            onClick={() => setLanguage("en")}
          >
            {t("settings.english")}
          </Button>
        </div>
      </div>
    );
  }

  // Default dropdown for header
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">{t("settings.language")}</span>
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => setLanguage("es")}
          className={currentLanguage === "es" ? "bg-muted" : ""}
        >
          {t("settings.spanish")}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage("en")}
          className={currentLanguage === "en" ? "bg-muted" : ""}
        >
          {t("settings.english")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}