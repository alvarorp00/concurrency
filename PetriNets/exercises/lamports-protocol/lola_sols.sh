lola lamport_completed.lola -f "REACHABLE DEADLOCK" # deadlock-free
lola lamport_completed.lola -f "REACHABLE (a1 + a2 + a3 = 1 AND b1 + b2 + b3 + b4 + b5 + b6 + b7 + b8 = 1)"  # program at multiple locations at the same time
lola lamport_completed.lola -f "REACHABLE (b7 = 1 AND a3 = 1)" # CS at the same time