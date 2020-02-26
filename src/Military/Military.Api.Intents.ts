import {
    MemoryApi_Military,
    MilitaryCombat_Api,
    MilitaryMovment_Api,
    ACTION_MOVE,
    ACTION_RANGED_ATTACK,
    ACTION_HEAL,
    Normalize,
    UserException,
    ERROR_ERROR,
    SQUAD_STATUS_RALLY
} from "Utils/Imports/internals";
import { MilitaryMovement_Helper } from "./Military.Movement.Helper";

export class MilitaryIntents_Api {
    /**
     * Reset the intents for the squad
     * @param instance the squad instance we are referring to
     */
    public static resetSquadIntents(instance: ISquadManager): void {
        const creeps = MemoryApi_Military.getLivingCreepsInSquadByInstance(instance);

        _.forEach(creeps, (creep: Creep) => {
            const creepStack = MemoryApi_Military.findCreepInSquadByInstance(instance, creep.name);

            if (creepStack === undefined) {
                return;
            }

            creepStack.intents = [];
        });
    }

    /**
     * Queue the intent to move the creep to their rally position
     * @param creep The creep we're queueing the intent for
     * @param instance the instance we're currently inside
     */
    public static queueIntentsMoveToRallyPos(creep: Creep, instance: ISquadManager, status: SquadStatusConstant): boolean {
        if (!instance.rallyPos || status !== SQUAD_STATUS_RALLY) {
            return false;
        }

        const rallyPos: RoomPosition = Normalize.convertMockToRealPos(instance.rallyPos);
        const direction: DirectionConstant = rallyPos.findPathTo(rallyPos)[0].direction;
        const intent: Move_MiliIntent = {
            action: ACTION_MOVE,
            target: direction,
            targetType: "direction"
        };

        MemoryApi_Military.pushIntentToCreepStack(instance, creep.name, intent);
        return true;
    }

    /**
     * Move the squad into their rally positions for quad squad
     * @param instance the instance we're controlling
     */
    public static queueIntentMoveQuadSquadRallyPos(creep: Creep, instance: ISquadManager, status: SquadStatusConstant): boolean {
        if (!instance.rallyPos || status !== SQUAD_STATUS_RALLY || !MilitaryMovment_Api.isSquadRallied(instance)) {
            return false;
        }
        const options: CreepOptionsMili = creep.memory.options as CreepOptionsMili;
        if (!options.caravanPos) {
            return false;
        }

        const currPos: RoomPosition = Normalize.convertMockToRealPos(instance.rallyPos);
        const exit = Game.map.findExit(currPos.roomName, instance.targetRoom);
        if (exit === ERR_NO_PATH || exit === ERR_INVALID_ARGS) {
            throw new UserException("No path or invalid args for isQuadSquadInRallyPos", "rip", ERROR_ERROR);
        }

        const posArr: RoomPosition[] = MilitaryMovement_Helper.getQuadSquadRallyPosArray(currPos, exit);
        const direction: DirectionConstant = currPos.findPathTo(posArr[options.caravanPos])[0].direction;
        const intent: Move_MiliIntent = {
            action: ACTION_MOVE,
            target: direction,
            targetType: "direction"
        };

        MemoryApi_Military.pushIntentToCreepStack(instance, creep.name, intent);
        return true;
    }

    /**
     * Queue an intent to move off the exit tile
     * @param creep
     * @param instance the squad the creep is apart of
     * @returns boolean representing if we queued the intent
     */
    public static queueIntentMoveOffExitTile(creep: Creep, instance: ISquadManager): boolean {
        const directionOffExitTile: DirectionConstant | undefined = MilitaryMovment_Api.getDirectionOffExitTile(creep);
        if (!directionOffExitTile) {
            return false;
        }

        const intent: Move_MiliIntent = {
            action: ACTION_MOVE,
            target: directionOffExitTile,
            targetType: "direction"
        };

        MemoryApi_Military.pushIntentToCreepStack(instance, creep.name, intent);
        return true;
    }

    /**
     * Queue intents to get to the target room
     * @param creep the creep we're controlling
     * @param instance the instance that the creep is in
     * @returns boolean representing if we queued an intent
     */
    public static queueIntentMoveToTargetRoom(creep: Creep, instance: ISquadManager): boolean {
        if (creep.room.name === instance.targetRoom) {
            return false;
        }

        const path = creep.pos.findPathTo(new RoomPosition(25, 25, instance.targetRoom), { range: 25 });
        const directionToTarget = path[0].direction;
        const intent: Move_MiliIntent = {
            action: ACTION_MOVE,
            target: directionToTarget,
            targetType: "direction"
        };

        MemoryApi_Military.pushIntentToCreepStack(instance, creep.name, intent);
        return true;
    }

    /**
     * Queue the kiting intent for an enemy creep
     * @param creep the creep we're queueing the intent for
     * @param targetHostile the hostile we want to kite
     * @param instance the squad instance we're controlling
     * @returns boolean representing if we queued an intent
     */
    public static queueIntentMoveTargetKiting(
        creep: Creep,
        targetHostile: Creep | undefined,
        instance: ISquadManager
    ): boolean {
        if (targetHostile) {
            let directionToTarget: DirectionConstant | undefined;

            if (MilitaryCombat_Api.isInAttackRange(creep, targetHostile.pos, false)) {
                directionToTarget = MilitaryCombat_Api.getKitingDirection(creep, targetHostile);

                if (!directionToTarget) {
                    return false;
                }
            } else {
                const path = creep.pos.findPathTo(targetHostile.pos, { range: 3 });
                directionToTarget = path[0].direction;
            }

            const intent: Move_MiliIntent = {
                action: ACTION_MOVE,
                target: directionToTarget,
                targetType: "direction"
            };

            MemoryApi_Military.pushIntentToCreepStack(instance, creep.name, intent);
            return true;
        }
        return false;
    }

    /**
     * Kite an enemy next to us
     * @param creep the creep we're controlling
     */
    public static queueIntentMoveNearHostileKiting(creep: Creep, instance: ISquadManager, hostiles: Creep[]): boolean {
        const closeEnemy: Creep | null = creep.pos.findClosestByPath(hostiles);
        if (closeEnemy && MilitaryCombat_Api.isInAttackRange(creep, closeEnemy.pos, false)) {
            const directionToTarget = MilitaryCombat_Api.getKitingDirection(creep, closeEnemy);
            if (!directionToTarget) {
                return false;
            }
            const intent: Move_MiliIntent = {
                action: ACTION_MOVE,
                target: directionToTarget,
                targetType: "direction"
            };

            MemoryApi_Military.pushIntentToCreepStack(instance, creep.name, intent);
            return true;
        }
        return false;
    }

    /**
     * Queue ranged attack intent for the ideal target
     * @param creep the creep we're controlling
     * @param instance the instance the creep is apart of
     * @returns boolean representing if we queued the intent
     */
    public static queueRangedAttackIntentBestTarget(
        creep: Creep,
        instance: ISquadManager,
        hostiles: Creep[] | undefined,
        creeps: Creep[]
    ): boolean {
        const bestTargetHostile: Creep | undefined = MilitaryCombat_Api.getRemoteDefenderAttackTarget(
            hostiles,
            creeps,
            instance.targetRoom
        );
        if (!bestTargetHostile) {
            return false;
        }

        if (creep.pos.inRangeTo(bestTargetHostile.pos, 3)) {
            const intent: RangedAttack_MiliIntent = {
                action: ACTION_RANGED_ATTACK,
                target: bestTargetHostile.id,
                targetType: "creepID"
            };

            MemoryApi_Military.pushIntentToCreepStack(instance, creep.name, intent);
            return true;
        }
        return false;
    }

    /**
     * Queue intent for an alternative target that isn't the ideal one
     * @param creep the creep we're controlling
     * @param instance the instance the creep is apart of
     * @param roomData the roomData for the operation
     * @returns boolean representing if we queued the intent
     */
    public static queueRangedAttackIntentAlternateClosestTarget(
        creep: Creep,
        instance: ISquadManager,
        roomData: MilitaryDataAll
    ): boolean {
        // Find any other attackable creep if we can't hit the best target
        const closestHostileCreep: Creep | undefined = _.find(
            roomData[instance.targetRoom].hostiles!.allHostiles,
            (hostile: Creep) => hostile.pos.getRangeTo(creep.pos) <= 3
        );

        if (closestHostileCreep !== undefined) {
            const intent: RangedAttack_MiliIntent = {
                action: ACTION_RANGED_ATTACK,
                target: closestHostileCreep.id,
                targetType: "creepID"
            };

            MemoryApi_Military.pushIntentToCreepStack(instance, creep.name, intent);
            return true;
        }
        return false;
    }

    /**
     * Queue intent for healing ourselves
     * @param creep the creep we're controlling
     * @param instance the instance the creep is apart of
     * @param roomData the roomData for the operation
     * @returns boolean representing if we queued the intent
     */
    public static queueHealSelfIntent(creep: Creep, instance: ISquadManager, roomData: MilitaryDataAll): boolean {
        // Heal if we are below full, preheal if theres hostiles and we aren't under a rampart
        const creepIsOnRampart: boolean =
            _.filter(
                creep.pos.lookFor(LOOK_STRUCTURES),
                (struct: Structure) => struct.structureType === STRUCTURE_RAMPART
            ).length > 0;
        if (
            (roomData[instance.targetRoom].hostiles!.allHostiles.length > 0 && !creepIsOnRampart) ||
            creep.hits < creep.hitsMax
        ) {
            const intent: Heal_MiliIntent = {
                action: ACTION_HEAL,
                target: creep.name,
                targetType: "creepName"
            };

            MemoryApi_Military.pushIntentToCreepStack(instance, creep.name, intent);
            return true;
        }
        return false;
    }

    /**
     * TODO
     * Queue intent for healing friendly creeps
     * @param creep the creep we're controlling
     * @param instance the instance the creep is apart of
     * @param roomData the roomData for the operation
     * @returns boolean representing if we queued the intent
     */
    public static queueHealAllyCreep(creep: Creep, instance: ISquadManager, roomData: MilitaryDataAll): boolean {
        return false;
    }
}
