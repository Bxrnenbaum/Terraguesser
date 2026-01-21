const input = document.getElementById("input_field");
const submitButton = document.getElementById("submit_button");

const cardTemplate = document.querySelector("#card-template");

let c;

submitButton.addEventListener("click", () => {
  printOutput(input.value, "card-container");
});

input.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    printOutput(input.value, "card-container");
  }
});

const data = await fetch("../data.json").then((response) => response.json());

console.log(data);

let target = data[Math.floor(Math.random() * data.length)];

console.log(target);

function printOutput(inputValue, outElement) {
  const clone = cardTemplate.content.cloneNode(true);
  const closestMatchResult = closestMatch2(
    inputValue,
    data.map((c) => c.country)
  );

  const inputLat = data.find((c) => c.country === closestMatchResult).countryLat;
  const inputLon = data.find((c) => c.country === closestMatchResult).countryLon;

  const dist = Math.round(100 * distanceKm(target.countryLat, target.countryLon, inputLat, inputLon)) / 100;
  clone.querySelector(".name").textContent = closestMatchResult + " - " + dist + " km";
  clone.querySelector(".flag").src =
    "https://flagcdn.com/" + data.find((c) => c.country === closestMatchResult).countryCode + ".svg";
  document.getElementById(outElement).appendChild(clone);

  input.value = "";

  if (dist === 0) {
    document.body.innerHTML += `<div class="win_effect"><div/>`;
  }
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const toRad = (angle) => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.asin(Math.sqrt(a));

  return R * c;
}

// Old approach, closestMatch2 is used instead
function closestMatch(input, options, maxDistance = Infinity) {
  function levenshtein(a, b) {
    const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));

    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[a.length][b.length];
  }

  let best = null;
  let bestScore = Infinity;
  input = input.toLowerCase();

  for (const option of options) {
    const score = levenshtein(input, option.toLowerCase());
    if (score < bestScore) {
      bestScore = score;
      best = option;
    }
  }

  return bestScore <= maxDistance ? best : null;
}

function closestMatch2(input, options, minSimilarity = 0) {
  // Function to calculate the
  // Jaro Similarity of two strings
  function jaro_distance(s1, s2) {
    // If the strings are equal
    if (s1 == s2) return 1.0;

    // Length of two strings
    let len1 = s1.length,
      len2 = s2.length;

    if (len1 == 0 || len2 == 0) return 0.0;

    // Maximum distance upto which matching
    // is allowed
    let max_dist = Math.floor(Math.max(len1, len2) / 2) - 1;

    // Count of matches
    let match = 0;

    // Hash for matches
    let hash_s1 = new Array(s1.length);
    hash_s1.fill(0);
    let hash_s2 = new Array(s2.length);
    hash_s2.fill(0);

    // Traverse through the first string
    for (let i = 0; i < len1; i++) {
      // Check if there is any matches
      for (let j = Math.max(0, i - max_dist); j < Math.min(len2, i + max_dist + 1); j++)
        // If there is a match
        if (s1[i] == s2[j] && hash_s2[j] == 0) {
          hash_s1[i] = 1;
          hash_s2[j] = 1;
          match++;
          break;
        }
    }

    // If there is no match
    if (match == 0) return 0.0;

    // Number of transpositions
    let t = 0;

    let point = 0;

    // Count number of occurrences
    // where two characters match but
    // there is a third matched character
    // in between the indices
    for (let i = 0; i < len1; i++)
      if (hash_s1[i] == 1) {
        // Find the next matched character
        // in second string
        while (hash_s2[point] == 0) point++;

        if (s1[i] != s2[point++]) t++;
      }
    t /= 2;

    // Return the Jaro Similarity
    return (match / len1 + match / len2 + (match - t) / match) / 3.0;
  }
  function jaro_Winkler(s1, s2) {
    let jaro_dist = jaro_distance(s1, s2);

    // If the jaro Similarity is above a threshold
    if (jaro_dist > 0.7) {
      // Find the length of common prefix
      let prefix = 0;

      for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
        // If the characters match
        if (s1[i] == s2[i]) prefix++;
        // Else break
        else break;
      }

      // Maximum of 4 characters are allowed in prefix
      prefix = Math.min(4, prefix);

      // Calculate jaro winkler Similarity
      jaro_dist += 0.1 * prefix * (1 - jaro_dist);
    }
    return jaro_dist.toFixed(6);
  }

  let best = null;
  let bestScore = -1; // Start lower than 0 to ensure the first match is caught
  input = input.toLowerCase();

  for (const option of options) {
    // Convert the string result of jaro_Winkler back to a number
    const score = parseFloat(jaro_Winkler(input, option.toLowerCase()));
    if (score > bestScore) {
      bestScore = score;
      best = option;
    }
  }

  // Ensure we compare numbers to numbers
  return bestScore >= parseFloat(minSimilarity) ? best : null;
}
