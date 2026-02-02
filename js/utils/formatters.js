export function convertiDataOra(matchDate, matchTime) {
    const [day, month] = matchDate.split("/");
    const [hour, minutes] = matchTime.split(":");
    const currentYear = new Date().getFullYear();
    return new Date(currentYear, month - 1, day, hour, minutes);
}

export function abbreviateName(name) {
    if (name.length <= 20) return name;

    const nameParts = name.split(" ");
    const firstName = nameParts[0];
    const abbreviatedLastName = nameParts
        .slice(1)
        .map((part) => part.charAt(0) + ".")
        .join(" ");

    const abbreviatedName = `${firstName} ${abbreviatedLastName}`;

    return abbreviatedName;
}

export function separateScorers(scorers) {
    const normalScorers = [];
    const ownGoals = [];

    Object.keys(scorers).forEach((scorer) => {
        if (scorer === "AutogolCasa" || scorer === "AutogolOspite") {
            ownGoals.push({ name: "Autogol", count: scorers[scorer] });
        } else {
            normalScorers.push({ name: scorer, count: scorers[scorer] });
        }
    });

    return { normalScorers, ownGoals };
}

export function formatDateTime(isoString) {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Mesi da 0 a 11
    const year = String(date.getFullYear()).slice(-2); // Ultime due cifre dell'anno
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function capitalize(str) {
    return str
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}
