// Subtle brand lockup for the front page — deliberately small and quiet.

export default function CoreEngineMark() {
  return (
    <div className="login-mark" aria-label="Core Engine">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.svg"
        width={22}
        height={22}
        alt=""
        aria-hidden="true"
      />
      <span>Core Engine</span>
    </div>
  );
}
