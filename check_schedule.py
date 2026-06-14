import json
from collections import defaultdict

def check_overlaps():
    with open("/Users/teerapatthongsima/Desktop/test/sunday_big_matches_new.json", 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    round_players = defaultdict(list)
    for game_id, matches in data.items():
        for match in matches:
            r = match['round']
            for key, val in match.items():
                if key in ['playerA', 'playerB', 'playerA1', 'playerA2', 'playerB1', 'playerB2', 
                           'playerYellow', 'playerGreen', 'playerBlue', 'playerRed']:
                    round_players[r].append((val, game_id, match['id']))
                    
    for r, p_list in sorted(round_players.items()):
        counts = defaultdict(list)
        for p, g, mid in p_list:
            counts[p].append((g, mid))
        for p, occ in counts.items():
            if len(occ) > 1:
                print(f"Round {r}: Player '{p}' plays in multiple matches: {occ}")

check_overlaps()
