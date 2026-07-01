import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="container mx-auto grid gap-8 px-4 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dsqxboxoc/image/upload/v1782801547/campus_logo_oj2pcn.png"
              alt="CampusConnect"
              className="h-8 w-8 rounded-lg object-contain"
            />
            <span className="font-display text-lg font-bold">CampusConnect</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            The modern way colleges run events: discovery, ticketing, attendance,
            and certificates — all in one place.
          </p>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold">Discover</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/events" className="hover:text-foreground">All events</Link></li>
            <li><Link to="/my-tickets" className="hover:text-foreground">My tickets</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold">Account</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/auth" className="hover:text-foreground">Sign in</Link></li>
            <li><Link to="/profile" className="hover:text-foreground">Profile</Link></li>
          </ul>
        </div>
      </div>
      <div className="container mx-auto mt-8 border-t border-border px-4 pt-6 text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} CampusConnect · Built for students
      </div>
    </footer>
  );
}
