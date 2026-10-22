
export function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  let greeting = "";

  if (hour < 12) {
    greeting = "Good morning";
  } else if (hour < 17) {
    greeting = "Good afternoon";
  } else if (hour < 22) {
    greeting = "Good evening";
  } else {
    greeting = "Good night";
  }

  return greeting;
}
