import Segment from "./segment.model.js";
import {
  buildQuery,
  previewSegmentSize,
  getSampleContacts,
  calculateSegmentStats,
  getPreBuiltSegments,
  syncSegment,
} from "../../services/segmentationService.js";

export const createSegment = async (req, res, next) => {
  try {
    const segment = await Segment.create(req.body);
    res.status(201).json(segment);
  } catch (err) {
    next(err);
  }
};

export const listSegments = async (req, res, next) => {
  try {
    const segments = await Segment.find({ isActive: true }).lean();
    res.json(segments);
  } catch (err) {
    next(err);
  }
};

export const getSegment = async (req, res, next) => {
  try {
    const segment = await Segment.findById(req.params.id);
    res.json(segment);
  } catch (err) {
    next(err);
  }
};

export const updateSegment = async (req, res, next) => {
  try {
    const segment = await Segment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(segment);
  } catch (err) {
    next(err);
  }
};

export const deleteSegment = async (req, res, next) => {
  try {
    await Segment.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: "Segment deleted" });
  } catch (err) {
    next(err);
  }
};

// Preview segment size
export const previewSegment = async (req, res, next) => {
  try {
    const { rules, logic } = req.body;
    const preview = await previewSegmentSize(rules, logic);
    res.json(preview);
  } catch (err) {
    next(err);
  }
};

// Get sample contacts from segment
export const getSampleSegmentContacts = async (req, res, next) => {
  try {
    const { rules, logic } = req.body;
    const { limit = 10 } = req.query;

    const contacts = await getSampleContacts(rules, logic, parseInt(limit));
    res.json(contacts);
  } catch (err) {
    next(err);
  }
};

// Get segment statistics
export const getSegmentStats = async (req, res, next) => {
  try {
    const stats = await calculateSegmentStats(req.params.id);
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

// Get pre-built segments
export const getPreBuiltSegmentsList = async (req, res, next) => {
  try {
    const preBuilt = getPreBuiltSegments();
    res.json(preBuilt);
  } catch (err) {
    next(err);
  }
};

// Sync segment (recalculate contacts)
export const syncSegmentContacts = async (req, res, next) => {
  try {
    const result = await syncSegment(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};