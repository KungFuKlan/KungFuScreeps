import { ROLE_REMOTE_DEFENDER, CreepMiliApi } from "Utils/Imports/internals";

// Manager for the miner creep role
export class RemoteDefenderCreepManager implements IMiliCreepRoleManager {
    public name: RoleConstant = ROLE_REMOTE_DEFENDER;

    constructor() {
        const self = this;
        self.runCreepRole = self.runCreepRole.bind(this);
    }

    /**
     * run the remote defender creep
     * @param creep the creep we are running
     */
    public runCreepRole(creep: Creep): void {
        const creepOptions: CreepOptionsMili = creep.memory.options as CreepOptionsMili;
        const CREEP_RANGE: number = 3;
        // Carry out the basics of a military creep before moving on to specific logic
        if (CreepMiliApi.checkMilitaryCreepBasics(creep, creepOptions)) {
            if (creep.hits < creep.hitsMax && _.some(creep.body, (b: BodyPartDefinition) => b.type === "heal")) {
                creep.heal(creep);
            }
            return;
        }

        // Find a target for the creep
        let target: Creep | Structure<StructureConstant> | undefined = CreepMiliApi.getAttackTarget(
            creep,
            creepOptions,
            CREEP_RANGE
        );

        // Temp fix for making remote defenders ignore roads and stuff
        if (!(target instanceof Creep)) {
            const invaderCore: StructureInvaderCore[] = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: s => s.structureType === STRUCTURE_INVADER_CORE }) as StructureInvaderCore[];
            target = invaderCore.length > 0 ? invaderCore[0] : undefined;
        }

        const isMelee: boolean = false;
        if (!target) {
            if (creep.hits < creep.hitsMax) {
                creep.heal(creep);
            }
            return; // idle if no current target
        }
        // If we aren't in attack range, move towards the attack target
        if (!CreepMiliApi.isInAttackRange(creep, target.pos, isMelee)) {
            creep.moveTo(target);
            if (creep.hits < creep.hitsMax) {
                creep.heal(creep);
            }
            return;
        } else {
            CreepMiliApi.kiteEnemyCreep(creep);
        }

        // We are in attack range and healthy, attack the target
        creep.rangedAttack(target);
        if (creep.hits < creep.hitsMax) {
            creep.heal(creep);
        }
    }
}
