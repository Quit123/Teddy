package com.sismics.docs.core.dao.jpa;

import com.sismics.docs.BaseTransactionalTest;
import com.sismics.docs.core.constant.PermType;
import com.sismics.docs.core.dao.AclDao;
import com.sismics.docs.core.dao.DocumentDao;
import com.sismics.docs.core.dao.UserDao;
import com.sismics.docs.core.dao.dto.DocumentDto;
import com.sismics.docs.core.model.jpa.Document;
import com.sismics.docs.core.model.jpa.User;
import com.sismics.docs.core.util.TransactionUtil;
import com.sismics.docs.core.util.authentication.InternalAuthenticationHandler;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;

import java.util.Date;
import java.util.List;
import java.util.UUID;

/**
 * Test Document DAO operations.
 */
public class TestDocumentDao extends BaseTransactionalTest {
    private User testUser;
    private DocumentDao documentDao;
    private UserDao userDao;

    @Before
    public void setUp() {
        // Create a test user
        userDao = new UserDao();
        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setPassword("12345678");
        testUser.setEmail("test@docs.com");
        TransactionUtil.commit();
    }

    private String createTestDocument() {
        Document document = new Document();
        document.setTitle("Test Document");
        document.setDescription("Test Description");
        document.setUserId(testUser.getId());
        return documentDao.create(document, testUser.getId());
    }

    @Test
    public void testCreateDocument() {
        documentDao = new DocumentDao();

        // Create document
        Document document = new Document();
        document.setTitle("Test Document");
        document.setDescription("Test Description");
        document.setUserId(testUser.getId());
        String docId = document.getId();

        TransactionUtil.commit();

        // Verify creation
        Document createdDoc = documentDao.getById(docId);
        Assert.assertNotNull(createdDoc);
        Assert.assertEquals("Test Document", createdDoc.getTitle());
        Assert.assertEquals(testUser.getId(), createdDoc.getUserId());
    }

    @Test
    public void testFindAll() {
        documentDao = new DocumentDao();

        // Create 3 documents
        createTestDocument();
        createTestDocument();
        createTestDocument();

        TransactionUtil.commit();

        // Test pagination
        List<Document> documents = documentDao.findAll(0, 2);
        Assert.assertEquals(2, documents.size());

        documents = documentDao.findAll(2, 10);
        Assert.assertEquals(1, documents.size());
    }

    @Test
    public void testFindByUserId() {
        documentDao = new DocumentDao();

        // Create document for test user
        String docID = createTestDocument();

        // Create another user's document
        User otherUser = new User();
        otherUser.setUsername("otheruser");
        otherUser.setPassword("12345678");
        try {
            userDao.create(otherUser, "otheruser");
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        Document otherDoc = new Document();
        otherDoc.setTitle("Other Doc");
        otherDoc.setUserId(otherUser.getId());
        documentDao.create(otherDoc, otherUser.getId());

        TransactionUtil.commit();

        // Verify user's documents
        List<Document> userDocs = documentDao.findByUserId(testUser.getId());
        Assert.assertEquals(1, userDocs.size());
        Assert.assertEquals(docID, userDocs.get(0).getId());
    }

    @Test
    public void testGetDocumentWithPermissions() {
        documentDao = new DocumentDao();
        AclDao aclDao = new AclDao();

        // Create document
        String docId = createTestDocument();
        TransactionUtil.commit();

        // Add READ permission to test user
        // aclDao.create(acl, testUser.getId());
        TransactionUtil.commit();

        // Test permission check
        DocumentDto dto = documentDao.getDocument(docId, PermType.READ, List.of(testUser.getId()));
        Assert.assertNotNull(dto);
        Assert.assertEquals("Test Document", dto.getTitle());
        Assert.assertEquals(testUser.getUsername(), dto.getCreator());

        // Test without permission
        DocumentDto noPermDto = documentDao.getDocument(docId, PermType.WRITE, List.of(testUser.getId()));
        Assert.assertNull(noPermDto);
    }

    @Test
    public void testDeleteDocument() {
        documentDao = new DocumentDao();

        // Create document
        String docId = createTestDocument();
        TransactionUtil.commit();

        // Delete document
        documentDao.delete(docId, testUser.getId());
        TransactionUtil.commit();

        // Verify deletion
        Document deletedDoc = documentDao.getById(docId);
        Assert.assertNull(deletedDoc);
    }

    @Test
    public void testUpdateDocument() {
        documentDao = new DocumentDao();

        // Create document
        String docID = createTestDocument();
        TransactionUtil.commit();

        // Verify update
        Document dbDoc = documentDao.getById(docID);
        Assert.assertEquals("Updated Title", dbDoc.getTitle());
        Assert.assertEquals(testUser.getId(), dbDoc.getUserId());
    }

    @Test
    public void testDocumentCount() {
        documentDao = new DocumentDao();

        // Initial count
        long initialCount = documentDao.getDocumentCount();

        // Create 2 documents
        createTestDocument();
        createTestDocument();
        TransactionUtil.commit();

        // Verify count
        Assert.assertEquals(initialCount + 2, documentDao.getDocumentCount());
    }

}