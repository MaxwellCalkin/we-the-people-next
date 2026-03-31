interface FooterProps {
  state?: string;
}

export default function Footer({ state }: FooterProps) {
  const registerUrl = state
    ? `https://vote.gov/register/${state}/`
    : "https://vote.gov/";

  return (
    <footer className="bg-navy-900 border-t-2 border-gold/30 py-10">
      <div className="mx-auto max-w-7xl px-4 text-center">
        <a
          href={registerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-lg md:text-xl font-bold tracking-wider text-cream hover:text-gold transition-colors uppercase"
        >
          Click Here to Register to Vote
        </a>
        <p className="mt-4 text-sm text-cream/50">
          &copy; {new Date().getFullYear()} Heard. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
