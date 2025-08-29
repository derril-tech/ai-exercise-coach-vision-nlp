'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Camera, ChevronDown } from 'lucide-react';

interface CameraControlsProps {
  devices: MediaDeviceInfo[];
  onSwitchCamera: (deviceId: string) => Promise<void>;
  currentDeviceId?: string;
}

export function CameraControls({ 
  devices, 
  onSwitchCamera, 
  currentDeviceId 
}: CameraControlsProps) {
  if (devices.length <= 1) {
    return null;
  }

  const currentDevice = devices.find(device => device.deviceId === currentDeviceId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Camera className="w-4 h-4" />
          {currentDevice?.label || 'Camera'}
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {devices.map((device) => (
          <DropdownMenuItem
            key={device.deviceId}
            onClick={() => onSwitchCamera(device.deviceId)}
            className={currentDeviceId === device.deviceId ? 'bg-accent' : ''}
          >
            <Camera className="w-4 h-4 mr-2" />
            {device.label || `Camera ${device.deviceId.slice(0, 8)}...`}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
