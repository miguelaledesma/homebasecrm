import Image from "next/image"
import Link from "next/link"

export function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
      <div className="flex items-center gap-3">
        {/* EZ FLOORS & MORE Logo */}
        <Image
          src="/logos/ezfloors.png"
          alt="EZ FLOORS & MORE"
          width={60}
          height={60}
          className="h-12 w-12 md:h-14 md:w-14 object-contain flex-shrink-0"
          priority
        />
        {/* A1 Interior & Exterior Designing Logo */}
        <Image
          src="/logos/redlogo.png"
          alt="A1 Interior & Exterior Designing"
          width={160}
          height={55}
          className="h-9 md:h-10 w-auto object-contain"
          priority
        />
      </div>
    </Link>
  )
}

