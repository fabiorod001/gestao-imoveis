import { Menu, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 safe-top">
      <div className="flex items-center justify-between h-14 md:h-16 px-4 md:px-6">
        {/* Mobile: Hamburger */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Logo/Title */}
        <div className="flex items-center gap-2">
          <h1 className="text-lg md:text-xl font-semibold text-gray-900">
            RentManager
          </h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {/* Notification badge */}
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </Button>
          
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
