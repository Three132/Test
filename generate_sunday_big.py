import json
import random
import sys
import math

players = {
    'yellow': {
        'R1': ['ออสติน', 'Harry', 'ลูว่า', 'เทนเทน', 'มิตตะ'],
        'R2': ['แทค', 'มรรค', 'อัลฟ่า', 'คิดถึง', 'ริชชี่', 'โบนัส', 'ซันจิ']
    },
    'green': {
        'R1': ['ทุน', 'ต่อ', 'ลิปตัล', 'Prize', 'TinTin'],
        'R2': ['ตฤณ', 'Gaspard', 'PV', 'ทังก้า', 'โฟโต้', 'Smart', 'แมค', 'พาย']
    },
    'blue': {
        'R1': ['ไตเติ้ล', 'นนท์', 'คิริน', 'Cooper', 'อะตอมW'],
        'R2': ['ฌอนเน่', 'เอิร์ท', 'โกฮัง', 'องศา', 'อัณยา', 'ดีโน่', 'เฌอโน่']
    },
    'red': {
        'R1': ['ลีโอ', 'ซอจุน', 'Onewon', 'Smith', 'ทีเค'],
        'R2': ['แพงตอง', 'TottiWBB', 'ปอห่อ', 'ภูดิน', 'คามิน', 'ปุ๊บปั๊บ', 'ออนเซน']
    }
}

player_info = {}
for color, groups in players.items():
    for r, names in groups.items():
        for name in names:
            player_info[name] = {'color': color, 'group': r}

all_player_names = list(player_info.keys())

# Define Sunday Big templates
G1_template = [
    {"id": 1, "round": 1, "colorA": "yellow", "colorB": "red"},
    {"id": 2, "round": 2, "colorA": "green", "colorB": "blue"},
    {"id": 3, "round": 3, "colorA": "green", "colorB": "blue"},
    {"id": 4, "round": 4, "colorA": "yellow", "colorB": "red"},
    {"id": 5, "round": 5, "colorA": "green", "colorB": "blue"},
    {"id": 6, "round": 6, "colorA": "green", "colorB": "blue"},
    {"id": 7, "round": 7, "colorA": "green", "colorB": "blue"},
    {"id": 8, "round": 8, "colorA": "yellow", "colorB": "red"},
    {"id": 9, "round": 9, "colorA": "yellow", "colorB": "red"},
    {"id": 10, "round": 10, "colorA": "green", "colorB": "blue"},
    {"id": 11, "round": 11, "colorA": "yellow", "colorB": "red"},
    {"id": 12, "round": 12, "colorA": "yellow", "colorB": "red"},
    {"id": 13, "round": 13, "colorA": "green", "colorB": "blue"}
]

G2_template = [
    {"id": 1, "round": 1, "colorA": "yellow", "colorB": "blue"},
    {"id": 2, "round": 2, "colorA": "blue", "colorB": "red"},
    {"id": 3, "round": 3, "colorA": "green", "colorB": "red"},
    {"id": 4, "round": 4, "colorA": "yellow", "colorB": "blue"},
    {"id": 5, "round": 5, "colorA": "yellow", "colorB": "green"},
    {"id": 6, "round": 6, "colorA": "yellow", "colorB": "green"},
    {"id": 7, "round": 7, "colorA": "yellow", "colorB": "green"},
    {"id": 8, "round": 8, "colorA": "yellow", "colorB": "blue"},
    {"id": 9, "round": 9, "colorA": "green", "colorB": "red"},
    {"id": 10, "round": 10, "colorA": "blue", "colorB": "red"},
    {"id": 11, "round": 11, "colorA": "green", "colorB": "red"},
    {"id": 12, "round": 12, "colorA": "blue", "colorB": "red"},
    {"id": 13, "round": 13, "colorA": "green", "colorB": "red"}
]

G3_template = [
    {"id": i, "round": i} for i in range(1, 14)
]

G4_template = [
    {"id": 1, "round": 1, "colorA": "yellow", "colorB": "red"},
    {"id": 2, "round": 2, "colorA": "yellow", "colorB": "green"},
    {"id": 3, "round": 3, "colorA": "yellow", "colorB": "green"},
    {"id": 4, "round": 4, "colorA": "yellow", "colorB": "red"},
    {"id": 5, "round": 5, "colorA": "blue", "colorB": "red"},
    {"id": 6, "round": 6, "colorA": "blue", "colorB": "red"},
    {"id": 7, "round": 7, "colorA": "green", "colorB": "blue"},
    {"id": 8, "round": 8, "colorA": "green", "colorB": "blue"},
    {"id": 9, "round": 9, "colorA": "blue", "colorB": "red"},
    {"id": 10, "round": 10, "colorA": "green", "colorB": "blue"},
    {"id": 11, "round": 11, "colorA": "yellow", "colorB": "green"},
    {"id": 12, "round": 12, "colorA": "yellow", "colorB": "red"},
    {"id": 13, "round": 13, "colorA": "green", "colorB": "blue"}
]

# Define slot groups
def get_slot_group(game, match_id, role, color):
    if game == 1:
        m = G1_template[match_id]
        mid = m["id"]
        if color in ['yellow', 'red']:
            if mid in [1, 4]:
                return "R1"
            elif mid == 12:
                return "R1" if role in ['playerA1', 'playerB1'] else "R2"
            else:
                return "R2"
        elif color == 'green':
            return "R1" if mid in [2, 3, 13] else "R2"
        elif color == 'blue':
            if mid in [2, 3, 13]:
                return "R1"
            elif mid == 10:
                return "R1" if role in ['playerB1'] else "R2"
            else:
                return "R2"
    elif game == 2:
        m = G2_template[match_id]
        mid = m["id"]
        if color == 'yellow':
            if mid in [5, 6]:
                return "R1"
            elif mid == 8:
                return "R1" if role in ['playerA1'] else "R2"
            else:
                return "R2"
        elif color == 'blue':
            if mid in [2, 10]:
                return "R1"
            elif mid == 8:
                return "R1" if role in ['playerB1'] else "R2"
            else:
                return "R2"
        elif color == 'green':
            return "R1" if mid in [5, 6, 11] else "R2"
        elif color == 'red':
            if mid in [2, 10, 11]:
                return "R1"
            elif mid == 12:
                return "R1" if role in ['playerB1'] else "R2"
            else:
                return "R2"
    elif game == 3:
        # G3: rounds 1, 2, 4, 7, 12 are R1, others are R2
        m = G3_template[match_id]
        return "R1" if m["id"] in [1, 2, 4, 7, 12] else "R2"
    elif game == 4:
        m = G4_template[match_id]
        mid = m["id"]
        if color == 'yellow':
            if mid in [2, 3]:
                return "R1"
            elif mid == 12:
                return "R1" if role == 'playerA1' else "R2"
            else:
                return "R2"
        elif color == 'red':
            if mid in [5, 6]:
                return "R1"
            elif mid == 12:
                return "R1" if role in ['playerB1'] else "R2"
            else:
                return "R2"
        elif color == 'green':
            return "R1" if mid in [2, 3, 13] else "R2"
        elif color == 'blue':
            if mid in [5, 6, 13]:
                return "R1"
            elif mid == 10:
                return "R1" if role in ['playerB1'] else "R2"
            else:
                return "R2"

# Identify all slots
slots = []

# Game 1
for mid, m in enumerate(G1_template):
    for role, color in [('playerA1', m['colorA']), ('playerA2', m['colorA']),
                        ('playerB1', m['colorB']), ('playerB2', m['colorB'])]:
        slots.append({
            'game': 1, 'match_id': mid, 'role': role, 'color': color,
            'group': get_slot_group(1, mid, role, color),
            'round': m['round']
        })

# Game 2
for mid, m in enumerate(G2_template):
    for role, color in [('playerA1', m['colorA']), ('playerA2', m['colorA']),
                        ('playerB1', m['colorB']), ('playerB2', m['colorB'])]:
        slots.append({
            'game': 2, 'match_id': mid, 'role': role, 'color': color,
            'group': get_slot_group(2, mid, role, color),
            'round': m['round']
        })

# Game 3
for mid, m in enumerate(G3_template):
    for role, color in [('playerYellow', 'yellow'), ('playerGreen', 'green'),
                        ('playerBlue', 'blue'), ('playerRed', 'red')]:
        slots.append({
            'game': 3, 'match_id': mid, 'role': role, 'color': color,
            'group': get_slot_group(3, mid, role, color),
            'round': m['round']
        })

# Game 4
for mid, m in enumerate(G4_template):
    for role, color in [('playerA1', m['colorA']), ('playerA2', m['colorA']),
                        ('playerB1', m['colorB']), ('playerB2', m['colorB'])]:
        slots.append({
            'game': 4, 'match_id': mid, 'role': role, 'color': color,
            'group': get_slot_group(4, mid, role, color),
            'round': m['round']
        })

# Group slots by (game, color, group)
slots_by_gcg = {}
for s in slots:
    key = (s['game'], s['color'], s['group'])
    if key not in slots_by_gcg:
        slots_by_gcg[key] = []
    slots_by_gcg[key].append(s)

# Create pools by cycling/replicating players to match slot count with a game-based offset to distribute duplicate slots
pool_by_gcg = {}
for key, sls in slots_by_gcg.items():
    game, color, group = key
    plist = list(players[color][group])
    N = len(sls)
    if N < len(plist):
        print(f"Error: Not enough slots for {key}, slots={N}, players={len(plist)}")
        sys.exit(1)
    
    pool = list(plist)
    remaining = N - len(plist)
    for i in range(remaining):
        pool.append(plist[(i + game) % len(plist)])
    pool_by_gcg[key] = pool

def compute_cost(assignment):
    cost = 0
    
    # 1. Teammate conflicts in Game 1, Game 2 and Game 4
    # Game 1
    for mid, m in enumerate(G1_template):
        if assignment.get((1, mid, 'playerA1')) == assignment.get((1, mid, 'playerA2')): cost += 1000000
        if assignment.get((1, mid, 'playerB1')) == assignment.get((1, mid, 'playerB2')): cost += 1000000
            
    # Game 2
    for mid, m in enumerate(G2_template):
        if assignment.get((2, mid, 'playerA1')) == assignment.get((2, mid, 'playerA2')): cost += 1000000
        if assignment.get((2, mid, 'playerB1')) == assignment.get((2, mid, 'playerB2')): cost += 1000000
            
    # Game 4
    for mid, m in enumerate(G4_template):
        if assignment.get((4, mid, 'playerA1')) == assignment.get((4, mid, 'playerA2')): cost += 1000000
        if assignment.get((4, mid, 'playerB1')) == assignment.get((4, mid, 'playerB2')): cost += 1000000
            
    # 2. Player schedules and round constraints
    player_rounds = {p: [] for p in all_player_names}
    
    for (game, match_id, role), p in assignment.items():
        if p in player_rounds:
            if game == 1: r = G1_template[match_id]['round']
            elif game == 2: r = G2_template[match_id]['round']
            elif game == 3: r = G3_template[match_id]['round']
            elif game == 4: r = G4_template[match_id]['round']
            player_rounds[p].append(r)
            
    for p, rounds in player_rounds.items():
        rounds.sort()
        # Round overlap
        if len(rounds) != len(set(rounds)):
            cost += 1000000 * (len(rounds) - len(set(rounds)))
            
        # Gaps
        for i in range(len(rounds) - 1):
            diff = rounds[i+1] - rounds[i]
            if diff < 2:
                cost += 100  # consecutive rounds (soft constraint)
            elif diff < 3:
                cost += 10   # 1 round rest
            elif diff < 4:
                cost += 1    # 2 rounds rest
                
    return cost

def solve():
    # Initial random assignment
    current_pools = {}
    current_assignment = {}
    
    for key, sls in slots_by_gcg.items():
        pool = list(pool_by_gcg[key])
        random.shuffle(pool)
        current_pools[key] = pool
        # Now every pool size matches slots exactly, so we assign all of them
        for idx, s in enumerate(sls):
            current_assignment[(s['game'], s['match_id'], s['role'])] = pool[idx]
            
    current_cost = compute_cost(current_assignment)
    print(f"Initial cost: {current_cost}", flush=True)
    
    if current_cost == 0:
        return current_assignment, current_pools
        
    best_assignment = dict(current_assignment)
    best_cost = current_cost
    best_pools = {k: list(v) for k, v in current_pools.items()}
    
    step = 0
    temp = 100.0
    cooling_rate = 0.99998
    keys = list(slots_by_gcg.keys())
    
    while step < 1500000:
        step += 1
        
        # Pick a random key
        key = random.choice(keys)
        sls = slots_by_gcg[key]
        pool = current_pools[key]
        
        if len(pool) < 2:
            continue
            
        # Pick two random distinct indices from the pool
        i, j = random.sample(range(len(pool)), 2)
        
        # Swap
        pool[i], pool[j] = pool[j], pool[i]
        
        # Update assignment only if we changed assigned elements
        changed_slots = []
        if i < len(sls):
            s_i = sls[i]
            current_assignment[(s_i['game'], s_i['match_id'], s_i['role'])] = pool[i]
            changed_slots.append((s_i, i))
        if j < len(sls):
            s_j = sls[j]
            current_assignment[(s_j['game'], s_j['match_id'], s_j['role'])] = pool[j]
            changed_slots.append((s_j, j))
            
        new_cost = compute_cost(current_assignment)
        
        # Accept/Reject
        if new_cost < current_cost:
            current_cost = new_cost
            if current_cost < best_cost:
                best_cost = current_cost
                best_assignment = dict(current_assignment)
                best_pools = {k: list(v) for k, v in current_pools.items()}
                print(f"Step {step}: New best cost = {best_cost}", flush=True)
                if best_cost == 0:
                    break
        else:
            if temp > 0.01 and random.random() < math.exp((current_cost - new_cost) / temp):
                current_cost = new_cost
            else:
                # Revert swap
                pool[i], pool[j] = pool[j], pool[i]
                for s, idx in changed_slots:
                    current_assignment[(s['game'], s['match_id'], s['role'])] = pool[idx]
                    
        temp *= cooling_rate
        
        # Random restarts if stuck
        if step % 200000 == 0 and best_cost > 0:
            print("Restarting search...", flush=True)
            current_assignment = {}
            current_pools = {}
            for k, sls in slots_by_gcg.items():
                p = list(pool_by_gcg[k])
                random.shuffle(p)
                current_pools[k] = p
                for idx, s in enumerate(sls):
                    current_assignment[(s['game'], s['match_id'], s['role'])] = p[idx]
            current_cost = compute_cost(current_assignment)
            temp = 100.0
            
    return best_assignment, best_pools

def generate_valid_schedule():
    best_assignment, best_pools = solve()
    
    final_cost = compute_cost(best_assignment)
    print(f"Final best cost: {final_cost}")
    
    # Calculate stats
    teammate_conflicts = 0
    for mid, m in enumerate(G1_template):
        if best_assignment.get((1, mid, 'playerA1')) == best_assignment.get((1, mid, 'playerA2')): teammate_conflicts += 1
        if best_assignment.get((1, mid, 'playerB1')) == best_assignment.get((1, mid, 'playerB2')): teammate_conflicts += 1
    for mid, m in enumerate(G2_template):
        if best_assignment.get((2, mid, 'playerA1')) == best_assignment.get((2, mid, 'playerA2')): teammate_conflicts += 1
        if best_assignment.get((2, mid, 'playerB1')) == best_assignment.get((2, mid, 'playerB2')): teammate_conflicts += 1
    for mid, m in enumerate(G4_template):
        if best_assignment.get((4, mid, 'playerA1')) == best_assignment.get((4, mid, 'playerA2')): teammate_conflicts += 1
        if best_assignment.get((4, mid, 'playerB1')) == best_assignment.get((4, mid, 'playerB2')): teammate_conflicts += 1

    player_rounds = {p: [] for p in all_player_names}
    for (game, match_id, role), p in best_assignment.items():
        if game == 1: r = G1_template[match_id]['round']
        elif game == 2: r = G2_template[match_id]['round']
        elif game == 3: r = G3_template[match_id]['round']
        elif game == 4: r = G4_template[match_id]['round']
        player_rounds[p].append((r, game))

    same_round_conflicts = 0
    consecutive_conflicts = 0
    one_rest_gaps = 0
    two_rest_gaps = 0
    
    for p, sched in player_rounds.items():
        sched.sort(key=lambda x: x[0])
        rs = [x[0] for x in sched]
        if len(rs) != len(set(rs)):
            same_round_conflicts += (len(rs) - len(set(rs)))
        for i in range(len(rs) - 1):
            diff = rs[i+1] - rs[i]
            if diff < 2:
                consecutive_conflicts += 1
            elif diff < 3:
                one_rest_gaps += 1
            elif diff < 4:
                two_rest_gaps += 1

    print(f"Teammate conflicts: {teammate_conflicts}")
    print(f"Same-round conflicts: {same_round_conflicts}")
    print(f"Consecutive round plays: {consecutive_conflicts}")
    print(f"1-round rest gaps: {one_rest_gaps}")
    print(f"2-round rest gaps: {two_rest_gaps}")

    # Format schedules
    g1_res = []
    for mid, m in enumerate(G1_template):
        g1_res.append({
            "id": m["id"],
            "round": m["round"],
            "type": "pole",
            "teamA": "#ffd600" if m["colorA"] == "yellow" else "#00ff66" if m["colorA"] == "green" else "#00f0ff" if m["colorA"] == "blue" else "#ff4b5c",
            "teamB": "#ffd600" if m["colorB"] == "yellow" else "#00ff66" if m["colorB"] == "green" else "#00f0ff" if m["colorB"] == "blue" else "#ff4b5c",
            "playerA1": best_assignment[(1, mid, 'playerA1')],
            "playerA2": best_assignment[(1, mid, 'playerA2')],
            "playerB1": best_assignment[(1, mid, 'playerB1')],
            "playerB2": best_assignment[(1, mid, 'playerB2')]
        })
        
    g2_res = []
    for mid, m in enumerate(G2_template):
        g2_res.append({
            "id": m["id"],
            "round": m["round"],
            "type": "pole",
            "teamA": "#ffd600" if m["colorA"] == "yellow" else "#00ff66" if m["colorA"] == "green" else "#00f0ff" if m["colorA"] == "blue" else "#ff4b5c",
            "teamB": "#ffd600" if m["colorB"] == "yellow" else "#00ff66" if m["colorB"] == "green" else "#00f0ff" if m["colorB"] == "blue" else "#ff4b5c",
            "playerA1": best_assignment[(2, mid, 'playerA1')],
            "playerA2": best_assignment[(2, mid, 'playerA2')],
            "playerB1": best_assignment[(2, mid, 'playerB1')],
            "playerB2": best_assignment[(2, mid, 'playerB2')]
        })
        
    g3_res = []
    for mid, m in enumerate(G3_template):
        g3_res.append({
            "id": m["id"],
            "round": m["round"],
            "type": "fishing",
            "playerYellow": best_assignment[(3, mid, 'playerYellow')],
            "playerGreen": best_assignment[(3, mid, 'playerGreen')],
            "playerBlue": best_assignment[(3, mid, 'playerBlue')],
            "playerRed": best_assignment[(3, mid, 'playerRed')]
        })
        
    g4_res = []
    for mid, m in enumerate(G4_template):
        g4_res.append({
            "id": m["id"],
            "round": m["round"],
            "type": "pole",
            "teamA": "#ffd600" if m["colorA"] == "yellow" else "#00ff66" if m["colorA"] == "green" else "#00f0ff" if m["colorA"] == "blue" else "#ff4b5c",
            "teamB": "#ffd600" if m["colorB"] == "yellow" else "#00ff66" if m["colorB"] == "green" else "#00f0ff" if m["colorB"] == "blue" else "#ff4b5c",
            "playerA1": best_assignment[(4, mid, 'playerA1')],
            "playerA2": best_assignment[(4, mid, 'playerA2')],
            "playerB1": best_assignment[(4, mid, 'playerB1')],
            "playerB2": best_assignment[(4, mid, 'playerB2')]
        })
        
    final_sched = {
        "1": g1_res,
        "2": g2_res,
        "3": g3_res,
        "4": g4_res
    }
    
    with open("/Users/teerapatthongsima/Desktop/test/sunday_big_matches_new.json", "w", encoding="utf-8") as f:
        json.dump(final_sched, f, ensure_ascii=False, indent=4)
    print("Success!")

generate_valid_schedule()
