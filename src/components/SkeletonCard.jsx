export default function SkeletonCard() {
  return (
    <div className="border border-mist rounded-lg md:rounded-xl p-1.5 md:p-3 w-full md:w-72 bg-white">
      <div className="skeleton w-full aspect-square md:aspect-[4/3] rounded-md md:rounded-lg" />
      <div className="skeleton h-3 md:h-5 w-3/4 rounded mt-1.5 md:mt-3" />
      <div className="skeleton h-2.5 md:h-4 w-1/2 rounded mt-1 md:mt-2" />
      <div className="skeleton h-2.5 md:h-5 w-2/3 rounded mt-1 md:mt-2" />
    </div>
  );
}