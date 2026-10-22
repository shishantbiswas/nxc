import moment from "moment";

export default function formatDateOrTime(createdDate: Date | string) {
  const now = moment();
  const diffInSeconds = now.diff(moment(createdDate), "seconds");
  const diffInHours = diffInSeconds / 3600;

  if (diffInHours < 1) {
    // Display time in HH:mm format if less than 1 hours

    const hours = Math.floor(diffInHours);
    const minutes = Math.round((diffInHours - hours) * 60);

    return `${minutes}m ago`;
  } else if (diffInHours < 24) {
    // Display time in HH:mm format if less than 24 hours

    const hours = Math.floor(diffInHours);
    const minutes = Math.round((diffInHours - hours) * 60);

    return `${hours}h ${minutes}m ago`;
  } else {
    // Display date in MMM D, YYYY format if more than 24 hours
    return moment(createdDate).format("MMM D, YYYY");
  }
}
