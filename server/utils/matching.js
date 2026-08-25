const compatibility = {
  "O-": ["O-"],
  "O+": ["O-", "O+"],
  "A-": ["O-", "A-"],
  "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
};

const urgencyWeight = {
  normal: 1,
  urgent: 1.35,
  critical: 1.7
};

export function isCompatible(donorBloodGroup, recipientBloodGroup) {
  const allowed = compatibility[recipientBloodGroup] || [];
  return allowed.includes(donorBloodGroup);
}

export function matchScore({ donor, request }) {
  let score = 0;

  if (donor.city && request.city && donor.city.toLowerCase() === request.city.toLowerCase()) {
    score += 30;
  }

  if (donor.area && request.area && donor.area.toLowerCase() === request.area.toLowerCase()) {
    score += 25;
  }

  if (donor.isVerified) {
    score += 20;
  }

  if (donor.availabilityStatus === "active") {
    score += 15;
  }

  if (donor.lastDonationAt) {
    const daysSinceLastDonation =
      (Date.now() - new Date(donor.lastDonationAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastDonation > 90) {
      score += 10;
    }
  } else {
    score += 8;
  }

  const weighted = score * (urgencyWeight[request.urgency] || 1);
  return Math.round(weighted);
}
