"use client";
import{usePathname}from"next/navigation";import{Header}from"./header";
export function AppShell({children}:{children:React.ReactNode}){const path=usePathname();if(path==="/login")return <>{children}</>;return <><Header/>{children}</>}
