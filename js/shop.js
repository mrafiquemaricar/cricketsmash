/**
 * Shop & Unlockables System for Cricket Smash
 * Manages bats, helmets, stadiums, coin balance, and persistence.
 */

class ShopManager {
  constructor() {
    this.coins = parseInt(localStorage.getItem('cricket_coins')) || 100; // Starter bonus
    
    // Equipped items
    this.equipped = {
      bat: localStorage.getItem('cricket_equipped_bat') || 'classic',
      helmet: localStorage.getItem('cricket_equipped_helmet') || 'blue_helm',
      stadium: localStorage.getItem('cricket_equipped_stadium') || 'park'
    };

    // Unlocked items arrays
    this.unlocked = {
      bats: JSON.parse(localStorage.getItem('cricket_unlocked_bats')) || ['classic'],
      helmets: JSON.parse(localStorage.getItem('cricket_unlocked_helmets')) || ['blue_helm'],
      stadiums: JSON.parse(localStorage.getItem('cricket_unlocked_stadiums')) || ['park']
    };

    // Items Catalog Definition
    this.catalog = {
      bats: [
        {
          id: 'classic',
          name: 'Classic Willow',
          icon: '🏏',
          desc: 'Standard reliable English Willow bat.',
          price: 0,
          powerBoost: 1.0,
          trail: 'none'
        },
        {
          id: 'thunderbolt',
          name: 'Thunderbolt Bat',
          icon: '⚡',
          desc: '+15% Power with electric shockwave trail.',
          price: 250,
          powerBoost: 1.15,
          trail: 'lightning'
        },
        {
          id: 'flame',
          name: 'Flame Strike',
          icon: '🔥',
          desc: '+30% Shot Power & blazing fire particles on 6s.',
          price: 600,
          powerBoost: 1.30,
          trail: 'fire'
        },
        {
          id: 'golden',
          name: 'Golden Champion',
          icon: '🌟',
          desc: '+50% Shot Power & wider timing sweetspot!',
          price: 1200,
          powerBoost: 1.50,
          trail: 'gold'
        }
      ],
      helmets: [
        {
          id: 'blue_helm',
          name: 'Classic Blue',
          icon: '🧢',
          desc: 'Standard pro safety helmet.',
          price: 0,
          effect: 'Standard'
        },
        {
          id: 'carbon_helm',
          name: 'Carbon Pro',
          icon: '🪖',
          desc: '+1 Extra Wicket Armor per match.',
          price: 300,
          effect: '+1 Wicket Armor'
        },
        {
          id: 'golden_helm',
          name: 'Royal Crown',
          icon: '👑',
          desc: '+20% Score Multiplier on all boundaries!',
          price: 750,
          effect: '+20% Score Boost'
        },
        {
          id: 'cyber_helm',
          name: 'Cyber Visor',
          icon: '🥽',
          desc: 'HUD Visor showing precise ball landing trajectory.',
          price: 1500,
          effect: 'Trajectory HUD'
        }
      ],
      stadiums: [
        {
          id: 'park',
          name: 'Local Park',
          icon: '🌳',
          desc: 'Sunny afternoon local cricket pitch.',
          price: 0,
          theme: 'park'
        },
        {
          id: 'oval',
          name: 'Royal Oval',
          icon: '🏟️',
          desc: 'Lush floodlit arena with roaring crowd.',
          price: 400,
          theme: 'oval'
        },
        {
          id: 'cyber',
          name: 'Cyber Arena',
          icon: '🌃',
          desc: 'Futuristic neon synth-wave stadium.',
          price: 800,
          theme: 'cyber'
        },
        {
          id: 'colosseum',
          name: 'Colosseum',
          icon: '🏛️',
          desc: 'Golden sand ancient epic arena.',
          price: 1600,
          theme: 'colosseum'
        }
      ]
    };
  }

  save() {
    localStorage.setItem('cricket_coins', this.coins);
    localStorage.setItem('cricket_equipped_bat', this.equipped.bat);
    localStorage.setItem('cricket_equipped_helmet', this.equipped.helmet);
    localStorage.setItem('cricket_equipped_stadium', this.equipped.stadium);
    localStorage.setItem('cricket_unlocked_bats', JSON.stringify(this.unlocked.bats));
    localStorage.setItem('cricket_unlocked_helmets', JSON.stringify(this.unlocked.helmets));
    localStorage.setItem('cricket_unlocked_stadiums', JSON.stringify(this.unlocked.stadiums));
  }

  addCoins(amount) {
    this.coins += amount;
    this.save();
    return this.coins;
  }

  getBat(id = this.equipped.bat) {
    return this.catalog.bats.find(b => b.id === id) || this.catalog.bats[0];
  }

  getHelmet(id = this.equipped.helmet) {
    return this.catalog.helmets.find(h => h.id === id) || this.catalog.helmets[0];
  }

  getStadium(id = this.equipped.stadium) {
    return this.catalog.stadiums.find(s => s.id === id) || this.catalog.stadiums[0];
  }

  buyItem(category, itemId) {
    const list = this.catalog[category];
    const item = list ? list.find(i => i.id === itemId) : null;

    if (!item) return { success: false, msg: 'Item not found' };

    const unlockedList = this.unlocked[category];

    if (unlockedList.includes(itemId)) {
      // Equip item
      this.equipped[category.replace(/s$/, '')] = itemId;
      this.save();
      window.soundEngine.playClick();
      return { success: true, action: 'equip', msg: 'Equipped!' };
    }

    if (this.coins < item.price) {
      return { success: false, msg: 'Not enough coins!' };
    }

    // Purchase item
    this.coins -= item.price;
    unlockedList.push(itemId);
    this.equipped[category.replace(/s$/, '')] = itemId;
    this.save();
    window.soundEngine.playCoin();
    return { success: true, action: 'buy', msg: 'Unlocked & Equipped!' };
  }
}

window.shopManager = new ShopManager();
