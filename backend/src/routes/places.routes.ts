
import { Router } from 'express';
import {
    getPlaces,
    getPlace,
    createPlace,
    updatePlace,
    deletePlace,
    getPlaceSignals,
    addPlaceSignal,
} from '../controllers/places.controller';
import { validate } from '../middleware/validateRequest';
import {
    createPlaceSchema,
    updatePlaceSchema,
    getPlaceSchema,
    listPlacesSchema,
    addSignalSchema,
} from '../schemas/places.schema';
import { combinedAuth } from '../middleware/combinedAuth';

const router = Router();

// Apply auth middleware to all routes
router.use(combinedAuth);

router.get('/', validate(listPlacesSchema), getPlaces);
router.get('/:id', validate(getPlaceSchema), getPlace);
router.post('/', validate(createPlaceSchema), createPlace);
router.put('/:id', validate(updatePlaceSchema), updatePlace);
router.delete('/:id', validate(getPlaceSchema), deletePlace); // Reuse getPlaceSchema for ID validation

// Signals
router.get('/:placeId/signals', getPlaceSignals);
router.post(
    '/:placeId/signals',
    validate(addSignalSchema),
    addPlaceSignal
);

export default router;
